package com.stayos.booking;

import com.google.gson.*;
import com.stayos.auth.AuthService.User;
import com.stayos.booking.BookingService.Failure;
import java.sql.*;
import java.time.*;
import java.util.*;

/** Extra services on a stay: add (classic or package catalog), cancel within the free window, staff confirmation. */
final class ServiceRequests extends Feature {
  ServiceRequests(Ledger ledger){super(ledger);}

  public JsonObject addService(User user,JsonObject input) throws SQLException {
    if(input.has("offerVersion"))return addOfferService(user,input);
    String bookingId=text(input,"bookingId",50);var service=bookable(item("services",text(input,"serviceId",40)));long start=number(input,"start");
    return transaction(()->{
      var row=find("stay_bookings",bookingId);access(user,row);var b=row.data();
      if(!Set.of("CONFIRMED","CHECKED_IN").contains(b.get("status").getAsString()))throw new Failure(409,"Kỳ nghỉ đã kết thúc hoặc đã hủy.");
      if(b.has("offerSnapshot"))throw new Failure(409,"Đơn có gói dùng danh mục dịch vụ của gói, có số lượng và khung giờ. Tải lại trang để chọn lại.");
      LocalDate day;
      try{day=Instant.ofEpochMilli(start).atZone(ZONE).toLocalDate();}catch(Exception e){throw new Failure(400,"Ngày hoạt động chưa hợp lệ.");}
      if(start<System.currentTimeMillis() || day.isBefore(date(b.get("arrival").getAsString())) || !day.isBefore(date(b.get("departure").getAsString())))throw new Failure(400,"Chọn hoạt động trong tương lai và trong kỳ lưu trú (giờ Việt Nam).");
      for(var element:rows("stay_requests",row.owner())){var q=element.getAsJsonObject();if(q.get("bookingId").getAsString().equals(bookingId)&&q.has("start")&&!"CANCELLED".equals(q.get("status").getAsString())&&Math.abs(q.get("start").getAsLong()-start)<3600000)throw new Failure(409,"Hoạt động trùng lịch trong vòng 60 phút.");}
      var q=insertRequest(row.owner(),bookingId,service,start);
      b.addProperty("total",b.get("total").getAsLong()+service.get("price").getAsLong());saveBooking(bookingId,b);
      event(row.owner(),user.email(),bookingId,"SERVICE_ADDED","Đã thêm "+service.get("name").getAsString());return q;
    });
  }
  /** Package bookings add services from the same offer catalog, quantities and time windows as checkout. */
  JsonObject addOfferService(User user,JsonObject input) throws SQLException {
    String bookingId=text(input,"bookingId",50),serviceId=text(input,"serviceId",40);
    if(!ledger.offers.revision().equals(text(input,"offerVersion",60)))throw new Failure(409,"Danh mục dịch vụ đã thay đổi. Tải lại trang và xem lại giá.");
    if(!input.has("schedule")||!input.get("schedule").isJsonObject())throw new Failure(400,"Chọn ngày giờ phục vụ.");
    long quantity=number(input,"quantity");if(quantity<1||quantity>6)throw new Failure(400,"Số lượng dịch vụ chưa hợp lệ.");
    return transaction(()->{
      var row=find("stay_bookings",bookingId);access(user,row);var b=row.data();
      if(!Set.of("CONFIRMED","CHECKED_IN").contains(b.get("status").getAsString()))throw new Failure(409,"Kỳ nghỉ đã kết thúc hoặc đã hủy.");
      if(!b.has("offerSnapshot"))throw new Failure(409,"Đơn cũ dùng danh mục dịch vụ trước đây.");
      var service=ledger.offers.service(serviceId,(int)quantity,input.getAsJsonObject("schedule"),b.get("arrival").getAsString(),b.get("departure").getAsString());
      if(number(input,"expectedPrice")!=service.get("price").getAsLong())throw new Failure(409,"Giá dịch vụ đã thay đổi. Xem lại tổng trước khi gửi.");
      long start=service.get("start").getAsLong();
      for(var element:rows("stay_requests",row.owner())){var q=element.getAsJsonObject();if(!q.get("bookingId").getAsString().equals(bookingId)||"CANCELLED".equals(q.get("status").getAsString()))continue;
        if(serviceId.equals("transfer")&&"transfer".equals(q.get("serviceId").getAsString()))throw new Failure(409,"Đơn này đã có yêu cầu xe đón.");
        if(q.has("start")&&Math.abs(q.get("start").getAsLong()-start)<3600000)throw new Failure(409,"Hoạt động trùng lịch trong vòng 60 phút.");}
      var q=insertRequest(row.owner(),bookingId,service,start);
      for(String field:List.of("quantity","unit","unitPrice","requestedSchedule","conditions","description"))q.add(field,service.get(field).deepCopy());saveRequest(q.get("id").getAsString(),q);
      b.addProperty("total",b.get("total").getAsLong()+service.get("price").getAsLong());saveBooking(bookingId,b);
      event(row.owner(),user.email(),bookingId,"SERVICE_ADDED","Đã thêm "+quantity+" × "+service.get("name").getAsString());return q;
    });
  }
  /** Guests may drop a service only while the free-cancellation window is open; the saved price comes off the booking total. */
  public JsonObject cancelRequest(User user,String id) throws SQLException {
    return transaction(()->{
      var row=find("stay_requests",id);access(user,row);var q=row.data();
      if("CANCELLED".equals(q.get("status").getAsString()))return q;
      var parent=find("stay_bookings",q.get("bookingId").getAsString());var b=parent.data();
      if(!Set.of("CONFIRMED","CHECKED_IN").contains(b.get("status").getAsString()))throw new Failure(409,"Kỳ nghỉ không còn hoạt động.");
      if(!q.has("start"))throw new Failure(409,"Dịch vụ chưa có lịch; gửi hỗ trợ để nhân viên kiểm tra.");
      long lead=("dining".equals(q.get("serviceId").getAsString())?12:24)*3600000L;
      if(!"admin".equals(user.role())&&q.get("start").getAsLong()-System.currentTimeMillis()<lead)throw new Failure(409,"Đã qua hạn hủy miễn phí "+lead/3600000+" giờ trước giờ phục vụ. Gửi hỗ trợ để nhân viên kiểm tra.");
      q.addProperty("status","CANCELLED");q.addProperty("cancelledAt",System.currentTimeMillis());q.addProperty("cancelledBy",user.role());saveRequest(id,q);
      b.addProperty("total",b.get("total").getAsLong()-q.get("price").getAsLong());saveBooking(b.get("id").getAsString(),b);
      event(parent.owner(),user.email(),b.get("id").getAsString(),"SERVICE_CANCELLED","Đã hủy "+q.get("name").getAsString()+"; trừ "+q.get("price").getAsLong()+"₫ khỏi tổng.");return q;
    });
  }
  public JsonObject confirmRequest(User user,String id) throws SQLException {
    if(!"admin".equals(user.role()))throw new Failure(403,"Bạn không có quyền quản trị.");
    return transaction(()->{
      var row=find("stay_requests",id);var q=row.data();
      if(!"PENDING".equals(q.get("status").getAsString()))throw new Failure(409,"Yêu cầu không còn chờ xác nhận.");
      var booking=find("stay_bookings",q.get("bookingId").getAsString());
      if(!Set.of("CONFIRMED","CHECKED_IN").contains(booking.data().get("status").getAsString()))throw new Failure(409,"Kỳ nghỉ không còn hoạt động.");
      q.addProperty("status","CONFIRMED");saveRequest(id,q);
      event(row.owner(),user.email(),q.get("bookingId").getAsString(),"SERVICE_CONFIRMED","Đã xác nhận "+q.get("name").getAsString());return q;
    });
  }
}
