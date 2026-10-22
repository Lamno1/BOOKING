package com.stayos.booking;

import com.google.gson.*;
import com.stayos.auth.AuthService.User;
import com.stayos.booking.BookingService.Failure;
import java.sql.*;
import java.time.*;
import java.util.*;

/** Support tickets between guest and staff, including date-change requests that staff approve or decline. */
final class SupportDesk extends Feature {
  private final Reservations reservations;
  SupportDesk(Ledger ledger, Reservations reservations){super(ledger);this.reservations=reservations;}

  void appendMessage(JsonObject ticket,User user,String message){
    var messages=ticket.getAsJsonArray("messages");if(messages.size()>=50)throw new Failure(409,"Cuộc trao đổi đã đủ 50 tin. Vui lòng mở yêu cầu mới nếu còn nội dung khác.");
    var entry=new JsonObject();entry.addProperty("id",UUID.randomUUID().toString());entry.addProperty("role",user.role());entry.addProperty("name",user.displayName());entry.addProperty("message",message);entry.addProperty("at",System.currentTimeMillis());messages.add(entry);
    ticket.addProperty("updatedAt",System.currentTimeMillis());
  }
  public JsonObject createSupport(User user,JsonObject input)throws SQLException{
    String bookingId=text(input,"bookingId",50),kind=text(input,"kind",30),message=text(input,"message",1000),key=text(input,"requestId",80);
    if(!Set.of("TOWELS","WIFI","CHECKIN","OTHER","DATE_CHANGE","INQUIRY").contains(kind))throw new Failure(400,"Loại yêu cầu chưa hợp lệ.");
    if(kind.equals("INQUIRY")&&!bookingId.equals("INQUIRY"))throw new Failure(400,"Mã tư vấn chưa hợp lệ.");
    return transaction(()->{
      boolean inquiry=kind.equals("INQUIRY");
      var parent=inquiry?new Ledger.Owned(user.email(),new JsonObject()):find("stay_bookings",bookingId);if(!inquiry)access(user,parent);
      if(inquiry){String propertyId=text(input,"propertyId",40);var property=item("properties",propertyId);parent.data().addProperty("propertyId",propertyId);parent.data().addProperty("propertyName",property.get("name").getAsString());parent.data().addProperty("guestName",user.displayName());parent.data().addProperty("roomName","Tư vấn trước đặt / sau kỳ nghỉ");}
      try(var s=db.prepareStatement("SELECT payload FROM stay_support WHERE owner=? AND request_key=?")){
        s.setString(1,parent.owner());s.setString(2,key);try(var r=s.executeQuery()){if(r.next()){var ticket=JsonParser.parseString(r.getString(1)).getAsJsonObject();if(!ticket.get("bookingId").getAsString().equals(bookingId))throw new Failure(409,"Mã gửi đã dùng cho đơn khác.");return ticket;}}
      }
      var booking=parent.data();if(!inquiry&&!Set.of("CONFIRMED","CHECKED_IN").contains(booking.get("status").getAsString())&&!kind.equals("OTHER"))throw new Failure(409,"Đơn đã kết thúc; chọn hỗ trợ sau kỳ nghỉ thay vì yêu cầu phục vụ tại phòng.");
      int active=0;for(var element:rows("stay_support",parent.owner())){var existing=element.getAsJsonObject();if(existing.get("bookingId").getAsString().equals(bookingId)&&supportOpen(existing)){
        active++;if(kind.equals("DATE_CHANGE")&&existing.get("kind").getAsString().equals("DATE_CHANGE"))throw new Failure(409,"Đơn này đã có yêu cầu đổi ngày đang chờ. Hãy xem lại hoặc rút yêu cầu cũ.");
      }}
      if(active>=5)throw new Failure(409,"Đơn này đã có 5 yêu cầu đang mở. Hãy trao đổi trong yêu cầu đã gửi.");
      var ticket=new JsonObject();String id="RQ-"+UUID.randomUUID().toString().substring(0,8).toUpperCase(Locale.ROOT);
      ticket.addProperty("id",id);ticket.addProperty("bookingId",bookingId);ticket.addProperty("kind",kind);ticket.addProperty("status","OPEN");ticket.addProperty("createdAt",System.currentTimeMillis());
      for(String field:List.of("propertyId","propertyName","roomId","roomName","guestName"))if(booking.has(field))ticket.add(field,booking.get(field).deepCopy());
      ticket.addProperty("owner",parent.owner());ticket.add("messages",new JsonArray());appendMessage(ticket,user,message);
      if(kind.equals("DATE_CHANGE")){
        var quote=reservations.changeQuote(booking,text(input,"arrival",10),text(input,"departure",10),Reservations.transferInput(input));
        if(number(input,"expectedTotal")!=quote.get("total").getAsLong()||number(input,"expectedCurrentTotal")!=quote.get("currentTotal").getAsLong())throw new Failure(409,"Giá đã thay đổi. Xem lại chênh lệch trước khi gửi.");
        ticket.add("change",quote);
      }
      try(var s=db.prepareStatement("INSERT INTO stay_support VALUES(?,?,?,?,?,?)")){s.setString(1,id);s.setString(2,parent.owner());s.setString(3,bookingId);s.setString(4,"OPEN");s.setString(5,key);s.setString(6,ticket.toString());s.executeUpdate();}
      event(parent.owner(),user.email(),bookingId,"SUPPORT_CREATED",id+" · "+(kind.equals("DATE_CHANGE")?"Đã gửi yêu cầu đổi ngày; đơn hiện tại được giữ.":"Đã gửi yêu cầu hỗ trợ."));return ticket;
    });
  }
  public JsonObject replySupport(User user,String id,JsonObject input,boolean admin)throws SQLException{
    if(admin&&!"admin".equals(user.role()))throw new Failure(403,"Bạn không có quyền quản trị.");
    String message=text(input,"message",1000);
    return transaction(()->{var row=find("stay_support",id);access(user,row);var ticket=row.data();
      if(!supportOpen(ticket))throw new Failure(409,"Yêu cầu này đã đóng. Nội dung được giữ để xem lại.");
      if(admin&&input.has("status")){
        String next=text(input,"status",30);if(!Set.of("OPEN","IN_PROGRESS","RESOLVED").contains(next))throw new Failure(400,"Trạng thái hỗ trợ chưa hợp lệ.");
        if(ticket.get("kind").getAsString().equals("DATE_CHANGE")&&next.equals("RESOLVED"))throw new Failure(400,"Dùng phê duyệt hoặc từ chối cho yêu cầu đổi ngày.");
        if(next.equals("RESOLVED")&&(!input.has("completionConfirmed")||!input.get("completionConfirmed").isJsonPrimitive()||!input.get("completionConfirmed").getAsJsonPrimitive().isBoolean()||!input.get("completionConfirmed").getAsBoolean()))throw new Failure(400,"Chỉ hoàn tất khi đã phục vụ hoặc xử lý xong nội dung, không phải mới ghi nhận.");
        if(next.equals("RESOLVED")){ticket.addProperty("completionConfirmed",true);ticket.addProperty("completedAt",System.currentTimeMillis());}
        ticket.addProperty("status",next);
      }
      appendMessage(ticket,user,message);saveSupport(ticket);event(row.owner(),user.email(),ticket.get("bookingId").getAsString(),"SUPPORT_REPLY",id+" · "+(admin?"Nhân viên đã phản hồi.":"Khách bổ sung nội dung."));return ticket;
    });
  }
  public JsonObject cancelSupport(User user,String id)throws SQLException{
    return transaction(()->{var row=find("stay_support",id);access(user,row);var ticket=row.data();if(!supportOpen(ticket))return ticket;
      ticket.addProperty("status","CANCELLED");ticket.addProperty("closedReason","Đã rút yêu cầu.");ticket.addProperty("updatedAt",System.currentTimeMillis());saveSupport(ticket);event(row.owner(),user.email(),ticket.get("bookingId").getAsString(),"SUPPORT_CANCELLED",id+" · Đã rút yêu cầu.");return ticket;});
  }
  public JsonObject decideChange(User user,String id,JsonObject input)throws SQLException{
    if(!"admin".equals(user.role()))throw new Failure(403,"Bạn không có quyền quản trị.");
    String decision=text(input,"decision",20),message=text(input,"message",1000);
    if(!Set.of("APPROVED","DECLINED").contains(decision))throw new Failure(400,"Quyết định chưa hợp lệ.");
    return transaction(()->{var row=find("stay_support",id);var ticket=row.data();
      if(!ticket.get("kind").getAsString().equals("DATE_CHANGE")||!supportOpen(ticket))throw new Failure(409,"Yêu cầu không còn chờ xét đổi ngày.");
      if(decision.equals("APPROVED")){
        var parent=find("stay_bookings",ticket.get("bookingId").getAsString());var booking=parent.data();var previous=ticket.getAsJsonObject("change");
        if(!booking.get("arrival").equals(previous.get("currentArrival"))||!booking.get("departure").equals(previous.get("currentDeparture"))||!booking.get("total").equals(previous.get("currentTotal")))throw new Failure(409,"Đơn hoặc tổng tiền đã thay đổi. Cần rút yêu cầu và báo giá lại trước khi phê duyệt.");
        var quote=reservations.changeQuote(booking,previous.get("arrival").getAsString(),previous.get("departure").getAsString(),previous.has("transferChange")?previous.getAsJsonObject("transferChange").getAsJsonObject("schedule"):null);
        if(!quote.get("total").equals(previous.get("total")))throw new Failure(409,"Giá đã thay đổi, chưa thể phê duyệt yêu cầu cũ.");
        if(!booking.has("initialStay")){var initial=new JsonObject();for(String field:List.of("arrival","departure","roomTotal","total","packageSupplement"))if(booking.has(field))initial.add(field,booking.get(field).deepCopy());if(booking.has("offerSnapshot"))initial.add("benefits",booking.getAsJsonObject("offerSnapshot").get("benefits").deepCopy());booking.add("initialStay",initial);}
        if(!booking.has("changes"))booking.add("changes",new JsonArray());var audit=quote.deepCopy();audit.addProperty("at",System.currentTimeMillis());audit.addProperty("actor",user.email());booking.getAsJsonArray("changes").add(audit);
        for(String field:List.of("arrival","departure","roomTotal","total"))booking.add(field,quote.get(field).deepCopy());
        if(quote.has("packageSupplement")){
          var offer=booking.getAsJsonObject("offerSnapshot");booking.add("packageSupplement",quote.get("packageSupplement").deepCopy());
          offer.add("supplement",quote.get("packageSupplement").deepCopy());offer.add("roomTotal",quote.get("roomTotal").deepCopy());offer.add("total",quote.get("total").deepCopy());offer.add("benefits",quote.get("benefits").deepCopy());
        }
        if(quote.has("transferChange")){
          // The pickup moves with the approved arrival and goes back to staff for reconfirmation; its price never changes.
          var change=quote.getAsJsonObject("transferChange");var request=find("stay_requests",change.get("requestId").getAsString()).data();
          request.add("start",change.get("start"));request.add("requestedSchedule",change.get("schedule").deepCopy());request.addProperty("status","PENDING");saveRequest(request.get("id").getAsString(),request);
        }
        try(var s=db.prepareStatement("UPDATE stay_bookings SET arrival=?,departure=?,payload=? WHERE id=?")){s.setString(1,booking.get("arrival").getAsString());s.setString(2,booking.get("departure").getAsString());s.setString(3,booking.toString());s.setString(4,booking.get("id").getAsString());s.executeUpdate();}
        event(row.owner(),user.email(),booking.get("id").getAsString(),"BOOKING_CHANGED","Đã duyệt đổi ngày sang "+booking.get("arrival").getAsString()+" → "+booking.get("departure").getAsString()+"; tổng "+booking.get("total").getAsLong()+"₫.");
      }
      ticket.addProperty("status",decision);appendMessage(ticket,user,message);saveSupport(ticket);event(row.owner(),user.email(),ticket.get("bookingId").getAsString(),"CHANGE_DECISION",id+" · "+(decision.equals("APPROVED")?"Đã duyệt đổi ngày.":"Đã từ chối đổi ngày; giữ đơn hiện tại."));return ticket;
    });
  }
}
