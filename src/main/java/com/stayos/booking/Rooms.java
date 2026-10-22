package com.stayos.booking;

import com.google.gson.*;
import com.stayos.auth.AuthService.User;
import com.stayos.booking.BookingService.Failure;
import java.sql.*;
import java.time.*;
import java.util.*;

/** Availability, per-room calendars and the room status board (open / cleaning / maintenance). */
final class Rooms extends Feature {
  Rooms(Ledger ledger){super(ledger);}

  public JsonObject availability(String arrival, String departure) throws SQLException {
    nights(arrival, departure);
    var result = new JsonObject(); var rooms = inventory.getAsJsonArray("rooms").deepCopy();
    for (var element : rooms) {
      var room=element.getAsJsonObject();String id=room.get("id").getAsString(),operation=roomOperation(id).get("status").getAsString();
      boolean booked=occupied(id,arrival,departure);
      room.addProperty("available", !booked && operation.equals("OPEN"));
      room.addProperty("availabilityReason",!operation.equals("OPEN")?"CLOSED":booked?"BOOKED":"AVAILABLE");
    }
    result.add("catalogVersion",inventory.get("version"));result.addProperty("arrival",arrival);result.addProperty("departure",departure);
    result.add("properties",inventory.getAsJsonArray("properties").deepCopy());
    result.add("rooms",rooms); result.add("services",inventory.getAsJsonArray("services").deepCopy()); return result;
  }
  /** Public night-by-night availability for one room. Only occupied nights are exposed, never who booked them. */
  public JsonObject calendar(String roomId,String from,int days) throws SQLException {
    item("rooms",roomId);LocalDate start=date(from);
    if(start.isBefore(LocalDate.now(ZONE))||days<1||days>120)throw new Failure(400,"Chọn khoảng lịch từ hôm nay, tối đa 120 ngày.");
    LocalDate end=start.plusDays(days);var booked=new TreeSet<String>();
    try(var s=db.prepareStatement("SELECT arrival,departure FROM stay_bookings WHERE room_id=? AND status NOT IN ('CANCELLED','CHECKED_OUT') AND arrival<? AND departure>?")){
      s.setString(1,roomId);s.setString(2,end.toString());s.setString(3,start.toString());
      try(var r=s.executeQuery()){while(r.next()){for(LocalDate night=LocalDate.parse(r.getString(1));night.isBefore(LocalDate.parse(r.getString(2)));night=night.plusDays(1))if(!night.isBefore(start)&&night.isBefore(end))booked.add(night.toString());}}
    }
    var result=new JsonObject();result.addProperty("roomId",roomId);result.addProperty("from",start.toString());result.addProperty("days",days);
    result.addProperty("open","OPEN".equals(roomOperation(roomId).get("status").getAsString()));
    var nights=new JsonArray();booked.forEach(nights::add);result.add("bookedNights",nights);return result;
  }
  public JsonObject operations(User user,String arrival,String departure)throws SQLException{
    if(!"admin".equals(user.role()))throw new Failure(403,"Bạn không có quyền quản trị.");
    var result=availability(arrival,departure);
    for(var element:result.getAsJsonArray("rooms")){var room=element.getAsJsonObject();room.add("operation",roomOperation(room.get("id").getAsString()));}
    return result;
  }
  public JsonObject setRoomOperation(User user,JsonObject input)throws SQLException{
    if(!"admin".equals(user.role()))throw new Failure(403,"Bạn không có quyền quản trị.");
    String id=text(input,"roomId",40),status=text(input,"status",20),note=text(input,"note",240);item("rooms",id);
    if(!Set.of("OPEN","CLEANING","MAINTENANCE").contains(status))throw new Failure(400,"Trạng thái phòng chưa hợp lệ.");
    return transaction(()->{
      try(var s=db.prepareStatement("INSERT INTO room_operations VALUES(?,?,?,?) ON CONFLICT(room_id) DO UPDATE SET status=excluded.status,note=excluded.note,updated_at=excluded.updated_at")){
        s.setString(1,id);s.setString(2,status);s.setString(3,note);s.setLong(4,System.currentTimeMillis());s.executeUpdate();
      }
      event(user.email(),user.email(),id,"ROOM_OPERATION",id+" · "+status+" · "+note);return roomOperation(id);
    });
  }
}
