package com.stayos.booking;

import com.google.gson.*;
import com.stayos.auth.AuthService.User;
import com.stayos.booking.BookingService.Failure;
import java.sql.*;
import java.time.*;
import java.util.*;

/** The booking itself: create, arrival details, status changes and date-change quotes. */
final class Reservations extends Feature {
  Reservations(Ledger ledger){super(ledger);}

  static final List<String> ARRIVAL_WINDOWS=List.of("14-16","16-18","18-20","20-22","22-24","after-24");
  /** Expected arrival window and special requests: requests for staff, not guarantees, and never priced. */
  static void applyArrivalDetails(JsonObject booking,JsonObject input){
    String window=optionalText(input,"arrivalWindow",10),note=optionalText(input,"specialRequests",300);
    if(!window.isEmpty()&&!ARRIVAL_WINDOWS.contains(window))throw new Failure(400,"Khung giờ đến chưa hợp lệ.");
    booking.addProperty("arrivalWindow",window);booking.addProperty("specialRequests",note);
  }
  public JsonObject create(User user, JsonObject input) throws SQLException {
    if(!input.has("catalogVersion") || !inventory.get("version").equals(input.get("catalogVersion")))
      throw new Failure(409,"Danh mục đã thay đổi. Tải lại trang trước khi xác nhận.");
    String roomId=text(input,"roomId",40), arrival=text(input,"arrival",10), departure=text(input,"departure",10);
    String key=text(input,"requestId",80), name=text(input,"guestName",100), email=text(input,"email",254);
    if(!email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$"))throw new Failure(400,"Email liên hệ chưa hợp lệ.");
    long nights=nights(arrival,departure), guests=number(input,"guests");
    var room=item("rooms",roomId);
    String propertyId = room.get("propertyId").getAsString();
    if(!propertyId.equals(text(input,"propertyId",40)))throw new Failure(400,"Phòng không thuộc cơ sở đã chọn.");
    var property=item("properties",propertyId);
    if(guests<1 || guests>room.get("capacity").getAsInt())throw new Failure(400,"Số khách vượt sức chứa phòng.");
    var addons=new LinkedHashSet<String>();
    if(input.has("addons")){
      if(!input.get("addons").isJsonArray() || input.getAsJsonArray("addons").size()>4)throw new Failure(400,"Danh sách dịch vụ chưa hợp lệ.");
      for(var addon:input.getAsJsonArray("addons")){if(!addon.isJsonPrimitive() || !addon.getAsJsonPrimitive().isString())throw new Failure(400,"Dịch vụ chưa hợp lệ."); item("services",addon.getAsString()); addons.add(addon.getAsString());}
    }
    var details=new JsonObject();applyArrivalDetails(details,input);
    long roomTotal=room.get("price").getAsLong()*nights;
    var offer=input.has("offerVersion")?ledger.offers.quote(input,room,(int)guests,nights,arrival,departure):null;
    if(offer!=null&&!addons.isEmpty())throw new Failure(400,"Không trộn dịch vụ cũ với gói mới.");
    long total=offer==null?roomTotal+addons.stream().mapToLong(id->item("services",id).get("price").getAsLong()).sum():offer.get("total").getAsLong();
    return transaction(()->{
      try(var s=db.prepareStatement("SELECT payload FROM stay_bookings WHERE owner=? AND request_key=?")){
        s.setString(1,user.email());s.setString(2,key);
        try(var r=s.executeQuery()){if(r.next())return JsonParser.parseString(r.getString(1)).getAsJsonObject();}
      }
      if(number(input,"expectedTotal")!=total)throw new Failure(409,"Giá đã thay đổi. Vui lòng xem lại tổng tiền và xác nhận.");
      if(!roomOperation(roomId).get("status").getAsString().equals("OPEN"))throw new Failure(409,"Phòng đang tạm ngưng nhận khách. Hãy chọn phòng khác.");
      if(occupied(roomId,arrival,departure))throw new Failure(409,"Phòng đã được đặt trong khoảng ngày này. Hãy chọn phòng hoặc ngày khác.");
      var booking=new JsonObject();String id="ST-"+UUID.randomUUID().toString().substring(0,8).toUpperCase(Locale.ROOT);
      booking.addProperty("id",id);booking.addProperty("roomId",roomId);booking.addProperty("roomName",room.get("name").getAsString());
      booking.addProperty("propertyId",propertyId);booking.addProperty("propertyName",property.get("name").getAsString());
      booking.addProperty("roomNumber",room.get("number").getAsString());
      booking.add("catalogVersion",inventory.get("version"));booking.add("roomSnapshot",room.deepCopy());
      booking.add("propertySnapshot",property.deepCopy());booking.addProperty("nightlyRate",room.get("price").getAsLong());
      booking.add("policy",property.getAsJsonObject("policy").deepCopy());
      booking.addProperty("cleaningFee",0);booking.addProperty("deposit",0);booking.addProperty("taxIncluded",true);
      booking.addProperty("arrival",arrival);booking.addProperty("departure",departure);booking.addProperty("guests",guests);
      booking.addProperty("guestName",name);booking.addProperty("email",email);booking.addProperty("roomTotal",roomTotal);
      for(var field:details.entrySet())booking.add(field.getKey(),field.getValue());
      if(offer!=null){booking.add("offerSnapshot",offer.deepCopy());booking.addProperty("packageSupplement",offer.get("supplement").getAsLong());}
      booking.addProperty("total",total);booking.addProperty("status","CONFIRMED");booking.addProperty("createdAt",System.currentTimeMillis());
      var ids=new JsonArray();addons.forEach(ids::add);booking.add("addons",ids);
      try(var s=db.prepareStatement("INSERT INTO stay_bookings VALUES(?,?,?,?,?,?,?,?)")){
        s.setString(1,id);s.setString(2,user.email());s.setString(3,roomId);s.setString(4,arrival);s.setString(5,departure);s.setString(6,"CONFIRMED");s.setString(7,key);s.setString(8,booking.toString());s.executeUpdate();
      }
      for(String service:addons)insertRequest(user.email(),id,item("services",service),null);
      if(offer!=null)for(var entry:offer.getAsJsonArray("items")){var service=entry.getAsJsonObject();var q=insertRequest(user.email(),id,service,service.get("start").getAsLong());for(String field:List.of("quantity","unit","unitPrice","requestedSchedule","conditions","description"))q.add(field,service.get(field).deepCopy());saveRequest(q.get("id").getAsString(),q);}
      event(user.email(),user.email(),id,"BOOKING_CREATED","Đã đặt "+room.get("name").getAsString());
      return booking;
    });
  }
  /** Guest (or staff) updates arrival window / special requests until check-in; price and dates never change here. */
  public JsonObject updateArrival(User user,String id,JsonObject input) throws SQLException {
    return transaction(()->{
      var row=find("stay_bookings",id);access(user,row);var b=row.data();
      if(!"CONFIRMED".equals(b.get("status").getAsString()))throw new Failure(409,"Chỉ cập nhật giờ đến và yêu cầu trước khi nhận phòng.");
      applyArrivalDetails(b,input);saveBooking(id,b);
      event(row.owner(),user.email(),id,"ARRIVAL_DETAILS","Cập nhật giờ đến và yêu cầu đặc biệt");return b;
    });
  }
  public JsonObject transition(User user,String id,String next) throws SQLException {
    return transaction(()->{
      var row=find("stay_bookings",id);access(user,row);var b=row.data();String previous=b.get("status").getAsString();
      if(previous.equals(next))return b;
      boolean allowed=("CONFIRMED".equals(previous)&&"CANCELLED".equals(next)) ||
        ("admin".equals(user.role()) && (("CONFIRMED".equals(previous)&&"CHECKED_IN".equals(next)) || ("CHECKED_IN".equals(previous)&&"CHECKED_OUT".equals(next))));
      if(!allowed)throw new Failure(403,"Không thể chuyển trạng thái này với quyền hiện tại.");
      if("CHECKED_IN".equals(next) && !LocalDate.now(ZONE).equals(date(b.get("arrival").getAsString())))throw new Failure(409,"Chỉ nhận phòng vào ngày đến.");
      if("CANCELLED".equals(next) && date(b.get("arrival").getAsString()).isBefore(LocalDate.now(ZONE)))throw new Failure(409,"Đã quá ngày hủy phòng.");
      b.addProperty("status",next);saveBooking(id,b);
      if("CANCELLED".equals(next)) {
        try(var s=db.prepareStatement("SELECT id,payload FROM stay_requests WHERE booking_id=?")) {
          s.setString(1,id);try(var r=s.executeQuery()){while(r.next()){var q=JsonParser.parseString(r.getString(2)).getAsJsonObject();q.addProperty("status","CANCELLED");saveRequest(r.getString(1),q);}}
        }
        for(var element:rows("stay_support",row.owner())){
          var ticket=element.getAsJsonObject();
          if(ticket.get("bookingId").getAsString().equals(id)&&supportOpen(ticket)){
            ticket.addProperty("status","CANCELLED");ticket.addProperty("closedReason","Đặt phòng đã hủy.");ticket.addProperty("updatedAt",System.currentTimeMillis());saveSupport(ticket);
          }
        }
      }
      event(row.owner(),user.email(),id,"BOOKING_STATUS",statusLabel(next));return b;
    });
  }
  String statusLabel(String status){return switch(status){case "CHECKED_IN"->"Đã nhận phòng";case "CHECKED_OUT"->"Đã trả phòng";case "CANCELLED"->"Đã hủy đặt phòng";default->status;};}
  public JsonObject changeQuote(User user,String bookingId,JsonObject input)throws SQLException{
    var row=find("stay_bookings",bookingId);access(user,row);return changeQuote(row.data(),text(input,"arrival",10),text(input,"departure",10),transferInput(input));
  }
  static JsonObject transferInput(JsonObject input){return input.has("transfer")&&input.get("transfer").isJsonObject()?input.getAsJsonObject("transfer"):null;}
  JsonObject changeQuote(JsonObject booking,String arrival,String departure,JsonObject transfer)throws SQLException{
    JsonObject transferChange=null;
    var offer=booking.has("offerSnapshot")?booking.getAsJsonObject("offerSnapshot"):null;
    if(offer!=null&&(!offer.has("plan")||!offer.getAsJsonObject("plan").has("perGuestNight")||!booking.has("packageSupplement")))throw new Failure(409,"Đơn có gói chưa đủ dữ liệu định mức. Gửi hỗ trợ để nhân viên kiểm tra; đơn hiện tại giữ nguyên.");
    if(!"CONFIRMED".equals(booking.get("status").getAsString())||date(booking.get("arrival").getAsString()).isBefore(LocalDate.now(ZONE)))throw new Failure(409,"Chỉ xin đổi ngày cho kỳ nghỉ chưa nhận phòng và chưa qua ngày đến.");
    long count=nights(arrival,departure);
    if(arrival.equals(booking.get("arrival").getAsString())&&departure.equals(booking.get("departure").getAsString()))throw new Failure(400,"Hãy chọn ngày ở khác với đơn hiện tại.");
    if(!booking.has("nightlyRate")||!booking.has("roomTotal"))throw new Failure(409,"Đơn cũ chưa có đủ dữ liệu giá. Vui lòng gửi yêu cầu hỗ trợ để nhân viên kiểm tra.");
    String roomId=booking.get("roomId").getAsString(),id=booking.get("id").getAsString();
    if(!roomOperation(roomId).get("status").getAsString().equals("OPEN"))throw new Failure(409,"Phòng đang tạm ngưng nhận thay đổi ngày.");
    try(var s=db.prepareStatement("SELECT 1 FROM stay_bookings WHERE room_id=? AND id<>? AND status NOT IN ('CANCELLED','CHECKED_OUT') AND arrival<? AND departure>? LIMIT 1")){
      s.setString(1,roomId);s.setString(2,id);s.setString(3,departure);s.setString(4,arrival);try(var r=s.executeQuery()){if(r.next())throw new Failure(409,"Phòng đã có khách trong ngày mới. Đơn hiện tại vẫn được giữ.");}
    }
    // A date change never shifts or drops a service appointment on the guest's behalf.
    try(var s=db.prepareStatement("SELECT payload FROM stay_requests WHERE booking_id=?")){
      s.setString(1,id);try(var r=s.executeQuery()){while(r.next()){
        var service=JsonParser.parseString(r.getString(1)).getAsJsonObject();
        if(service.has("start")&&!"CANCELLED".equals(service.get("status").getAsString())){
          var instant=Instant.ofEpochMilli(service.get("start").getAsLong());String serviceId=service.get("serviceId").getAsString(),name=service.get("name").getAsString();
          if(service.has("requestedSchedule")&&serviceId.equals("transfer")){
            if(instant.atZone(ZONE).toLocalDate().toString().equals(arrival))continue;
            if(transfer==null)throw new Failure(409,"Xe đón đã đặt theo ngày nhận cũ. Nhập giờ hạ cánh và chuyến bay mới cho ngày nhận mới.");
            var schedule=new JsonObject();schedule.addProperty("date",arrival);schedule.add("time",transfer.get("time"));schedule.add("flight",transfer.get("flight"));
            var moved=ledger.offers.service("transfer",service.get("quantity").getAsInt(),schedule,arrival,departure);
            transferChange=new JsonObject();transferChange.addProperty("requestId",service.get("id").getAsString());transferChange.addProperty("previousStart",service.get("start").getAsLong());
            if(service.has("requestedSchedule"))transferChange.add("previousSchedule",service.get("requestedSchedule").deepCopy());
            transferChange.addProperty("start",moved.get("start").getAsLong());transferChange.add("schedule",moved.get("requestedSchedule").deepCopy());
            continue;
          }
          long hours=service.has("requestedSchedule")?(serviceId.equals("spa")?1:serviceId.equals("tour")?3:0):0;
          var start=date(arrival).atTime(14,0).atZone(ZONE).toInstant();var end=date(departure).atTime(12,0).atZone(ZONE).toInstant();
          if(instant.isBefore(start)||!instant.isBefore(end)||instant.plusSeconds(hours*3600).isAfter(end))throw new Failure(409,"Lịch "+name+" nằm ngoài ngày ở mới. Gửi hỗ trợ để thống nhất lịch trước khi đổi ngày.");
        }
      }}
    }
    long previous=booking.get("total").getAsLong(),roomTotal=booking.get("nightlyRate").getAsLong()*count,guests=booking.get("guests").getAsLong();
    long currentSupplement=offer==null?0:booking.get("packageSupplement").getAsLong(),supplement=offer==null?0:offer.getAsJsonObject("plan").get("perGuestNight").getAsLong()*guests*count;
    long serviceTotal=previous-booking.get("roomTotal").getAsLong()-currentSupplement;
    var result=new JsonObject();result.addProperty("bookingId",id);result.addProperty("arrival",arrival);result.addProperty("departure",departure);result.addProperty("nights",count);
    result.addProperty("currentArrival",booking.get("arrival").getAsString());result.addProperty("currentDeparture",booking.get("departure").getAsString());result.addProperty("currentTotal",previous);
    result.addProperty("nightlyRate",booking.get("nightlyRate").getAsLong());result.addProperty("roomTotal",roomTotal);result.addProperty("serviceTotal",serviceTotal);result.addProperty("total",roomTotal+supplement+serviceTotal);
    if(offer!=null){
      // Re-rate the package from the unit price saved on the booking, never from the current offer file.
      result.addProperty("currentPackageSupplement",currentSupplement);result.addProperty("packageSupplement",supplement);result.addProperty("planName",offer.getAsJsonObject("plan").get("name").getAsString());
      var benefits=offer.getAsJsonArray("benefits").deepCopy();
      for(var element:benefits){var benefit=element.getAsJsonObject();if(benefit.get("name").getAsString().equals("Bữa sáng"))benefit.addProperty("quantity",guests*count);}
      result.add("benefits",benefits);
    }
    if(transferChange!=null)result.add("transferChange",transferChange);
    return result;
  }
}
