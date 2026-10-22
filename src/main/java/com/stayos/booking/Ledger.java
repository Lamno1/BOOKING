package com.stayos.booking;

import com.google.gson.*;
import com.stayos.auth.AuthService.User;
import com.stayos.booking.BookingService.Failure;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * The SQLite ledger every feature writes to: schema, transactions, ownership checks, the guest-visible history,
 * and the few records several features touch (bookings, service requests, support tickets).
 * Not thread-safe on its own; BookingService serialises all access.
 */
final class Ledger implements AutoCloseable {
  static final ZoneId ZONE=BookingService.ZONE;
  final Connection db;
  final JsonObject inventory;
  final BookingOffer offers=new BookingOffer();

  Ledger(String url)throws SQLException{
    db=DriverManager.getConnection(url);
    try(var stream=Ledger.class.getResourceAsStream("/web/src/shared/data/inventory.json")){
      if(stream==null)throw new IllegalStateException("Missing inventory");
      inventory=JsonParser.parseReader(new InputStreamReader(stream,StandardCharsets.UTF_8)).getAsJsonObject();
    }catch(java.io.IOException e){throw new IllegalStateException(e);}
    migrate();
  }

  private void migrate()throws SQLException{
    try(var s=db.createStatement()){
      s.execute("PRAGMA busy_timeout=5000");
      s.execute("PRAGMA journal_mode=WAL");
      s.execute("CREATE TABLE IF NOT EXISTS stay_bookings (id TEXT PRIMARY KEY, owner TEXT NOT NULL, room_id TEXT NOT NULL, arrival TEXT NOT NULL, departure TEXT NOT NULL, status TEXT NOT NULL, request_key TEXT NOT NULL, payload TEXT NOT NULL, UNIQUE(owner,request_key))");
      s.execute("CREATE INDEX IF NOT EXISTS stay_dates ON stay_bookings(room_id,arrival,departure,status)");
      s.execute("CREATE TABLE IF NOT EXISTS stay_requests (id TEXT PRIMARY KEY, owner TEXT NOT NULL, booking_id TEXT NOT NULL, payload TEXT NOT NULL)");
      s.execute("CREATE TABLE IF NOT EXISTS stay_history (id TEXT PRIMARY KEY, owner TEXT NOT NULL, payload TEXT NOT NULL)");
      s.execute("CREATE TABLE IF NOT EXISTS room_operations (room_id TEXT PRIMARY KEY, status TEXT NOT NULL, note TEXT NOT NULL, updated_at INTEGER NOT NULL)");
      s.execute("CREATE TABLE IF NOT EXISTS stay_support (id TEXT PRIMARY KEY, owner TEXT NOT NULL, booking_id TEXT NOT NULL, status TEXT NOT NULL, request_key TEXT NOT NULL, payload TEXT NOT NULL, UNIQUE(owner,request_key))");
      s.execute("CREATE INDEX IF NOT EXISTS stay_support_booking ON stay_support(booking_id,status)");
      s.execute("CREATE TABLE IF NOT EXISTS stay_reviews (id TEXT PRIMARY KEY, owner TEXT NOT NULL, booking_id TEXT NOT NULL UNIQUE, room_id TEXT NOT NULL, status TEXT NOT NULL, payload TEXT NOT NULL)");
      s.execute("CREATE INDEX IF NOT EXISTS stay_reviews_room ON stay_reviews(room_id,status)");
      s.execute("CREATE TABLE IF NOT EXISTS stay_saved (owner TEXT NOT NULL, room_id TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(owner,room_id))");
      // Guest pages read everything by owner; without these every page load scans the whole ledger.
      for(String table:List.of("stay_bookings","stay_requests","stay_history","stay_support","stay_reviews"))s.execute("CREATE INDEX IF NOT EXISTS "+table+"_owner ON "+table+"(owner)");
      s.execute("CREATE INDEX IF NOT EXISTS stay_requests_booking ON stay_requests(booking_id)");
      s.execute("CREATE TABLE IF NOT EXISTS stay_staff_notes (booking_id TEXT PRIMARY KEY, note TEXT NOT NULL, updated_by TEXT NOT NULL, updated_at INTEGER NOT NULL)");
    }
  }

  // ---- input and catalog ----
  static String text(JsonObject in,String key,int max){return BookingService.text(in,key,max);}
  /** Optional free text: missing or blank is "", otherwise trimmed and at most `max` characters. */
  static String optionalText(JsonObject in,String key,int max){
    var value=in.get(key);if(value==null||value.isJsonNull())return "";
    if(!value.isJsonPrimitive()||!value.getAsJsonPrimitive().isString())throw new Failure(400,"Trường "+key+" chưa hợp lệ.");
    String result=value.getAsString().strip();if(result.length()>max)throw new Failure(400,"Trường "+key+" dài quá "+max+" ký tự.");return result;
  }
  static long number(JsonObject in,String key){
    try{
      var value=in.get(key);
      if(value==null||!value.isJsonPrimitive()||!value.getAsJsonPrimitive().isNumber())throw new IllegalArgumentException();
      return value.getAsBigDecimal().longValueExact();
    }catch(Exception e){throw new Failure(400,"Trường "+key+" phải là số nguyên.");}
  }
  /** A catalog service marked "available": false can no longer be added; bookings that already have it keep it. */
  static JsonObject bookable(JsonObject service){
    if(service.has("available")&&!service.get("available").getAsBoolean())
      throw new Failure(409,service.has("unavailableReason")?service.get("unavailableReason").getAsString():"Dịch vụ này đang tạm ngưng.");
    return service;
  }
  static void requireAdmin(User user){if(!"admin".equals(user.role()))throw new Failure(403,"Bạn không có quyền quản trị.");}
  JsonObject item(String list,String id){
    for(var element:inventory.getAsJsonArray(list))if(element.getAsJsonObject().get("id").getAsString().equals(id))return element.getAsJsonObject();
    throw new Failure(400,"Không tìm thấy phòng hoặc dịch vụ đã chọn.");
  }
  LocalDate date(String value){
    try{LocalDate parsed=LocalDate.parse(value);if(!parsed.toString().equals(value))throw new IllegalArgumentException();return parsed;}
    catch(Exception e){throw new Failure(400,"Ngày chưa hợp lệ.");}
  }
  long nights(String arrival,String departure){
    LocalDate a=date(arrival),d=date(departure);
    long nights=ChronoUnit.DAYS.between(a,d);
    if(a.isBefore(LocalDate.now(ZONE))||nights<1||nights>90)throw new Failure(400,"Chọn ngày từ hôm nay, kỳ nghỉ từ 1 đến 90 đêm.");
    return nights;
  }

  // ---- storage ----
  record Owned(String owner,JsonObject data){}
  @FunctionalInterface interface Work{JsonObject run()throws SQLException;}
  JsonObject transaction(Work work)throws SQLException{
    try(var s=db.createStatement()){s.execute("BEGIN IMMEDIATE");}
    try{
      var result=work.run();try(var s=db.createStatement()){s.execute("COMMIT");}return result;
    }catch(SQLException|RuntimeException e){try(var s=db.createStatement()){s.execute("ROLLBACK");}throw e;}
  }
  JsonArray rows(String table,String owner)throws SQLException{
    var result=new JsonArray();
    try(var s=db.prepareStatement("SELECT payload FROM "+table+(owner==null?"":" WHERE owner=?")+" ORDER BY rowid")){
      if(owner!=null)s.setString(1,owner);
      try(var r=s.executeQuery()){while(r.next())result.add(JsonParser.parseString(r.getString(1)));}
    }
    return result;
  }
  Owned find(String table,String id)throws SQLException{
    try(var s=db.prepareStatement("SELECT owner,payload FROM "+table+" WHERE id=?")){
      s.setString(1,id);try(var r=s.executeQuery()){if(r.next())return new Owned(r.getString(1),JsonParser.parseString(r.getString(2)).getAsJsonObject());}
    }
    throw new Failure(404,"Không tìm thấy bản ghi.");
  }
  /** Someone else's record looks exactly like a missing one. */
  void access(User user,Owned row){if(!row.owner().equals(user.email())&&!"admin".equals(user.role()))throw new Failure(404,"Không tìm thấy bản ghi.");}
  /** Guest-visible history entry, written in the same transaction as the change it describes. */
  void event(String owner,String actor,String bookingId,String type,String message)throws SQLException{
    var event=new JsonObject();String id=UUID.randomUUID().toString();
    event.addProperty("id",id);event.addProperty("bookingId",bookingId);event.addProperty("type",type);event.addProperty("message",message);event.addProperty("at",System.currentTimeMillis());event.addProperty("actor",actor);
    try(var s=db.prepareStatement("INSERT INTO stay_history VALUES(?,?,?)")){s.setString(1,id);s.setString(2,owner);s.setString(3,event.toString());s.executeUpdate();}
  }

  // ---- records shared between features ----
  void saveBooking(String id,JsonObject data)throws SQLException{
    try(var s=db.prepareStatement("UPDATE stay_bookings SET status=?,payload=? WHERE id=?")){s.setString(1,data.get("status").getAsString());s.setString(2,data.toString());s.setString(3,id);s.executeUpdate();}
  }
  JsonObject roomOperation(String id)throws SQLException{
    var result=new JsonObject();result.addProperty("status","OPEN");result.addProperty("note","");
    try(var s=db.prepareStatement("SELECT status,note,updated_at FROM room_operations WHERE room_id=?")){
      s.setString(1,id);try(var r=s.executeQuery()){if(r.next()){result.addProperty("status",r.getString(1));result.addProperty("note",r.getString(2));result.addProperty("updatedAt",r.getLong(3));}}
    }return result;
  }
  boolean occupied(String room,String arrival,String departure)throws SQLException{
    try(var s=db.prepareStatement("SELECT 1 FROM stay_bookings WHERE room_id=? AND status NOT IN ('CANCELLED','CHECKED_OUT') AND arrival<? AND departure>? LIMIT 1")){
      s.setString(1,room);s.setString(2,departure);s.setString(3,arrival);
      try(var r=s.executeQuery()){return r.next();}
    }
  }
  JsonObject insertRequest(String owner,String bookingId,JsonObject service,Long start)throws SQLException{
    var q=new JsonObject();String id=UUID.randomUUID().toString();
    var parent=find("stay_bookings",bookingId).data();
    if(parent.has("propertyId")){q.add("propertyId",parent.get("propertyId"));q.add("propertyName",parent.get("propertyName"));}
    q.addProperty("id",id);q.addProperty("bookingId",bookingId);q.addProperty("serviceId",service.get("id").getAsString());q.addProperty("name",service.get("name").getAsString());q.addProperty("price",service.get("price").getAsLong());q.addProperty("status","PENDING");
    if(start!=null)q.addProperty("start",start);
    try(var s=db.prepareStatement("INSERT INTO stay_requests VALUES(?,?,?,?)")){s.setString(1,id);s.setString(2,owner);s.setString(3,bookingId);s.setString(4,q.toString());s.executeUpdate();}
    return q;
  }
  void saveRequest(String id,JsonObject q)throws SQLException{
    try(var s=db.prepareStatement("UPDATE stay_requests SET payload=? WHERE id=?")){s.setString(1,q.toString());s.setString(2,id);s.executeUpdate();}
  }
  static boolean supportOpen(JsonObject ticket){return Set.of("OPEN","IN_PROGRESS").contains(ticket.get("status").getAsString());}
  void saveSupport(JsonObject ticket)throws SQLException{
    try(var s=db.prepareStatement("UPDATE stay_support SET status=?,payload=? WHERE id=?")){s.setString(1,ticket.get("status").getAsString());s.setString(2,ticket.toString());s.setString(3,ticket.get("id").getAsString());s.executeUpdate();}
  }

  @Override public void close()throws SQLException{db.close();}
}
