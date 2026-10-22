package com.stayos.booking;

import com.google.gson.*;
import com.stayos.auth.AuthService.User;
import com.stayos.booking.BookingService.Failure;
import java.sql.*;
import java.time.*;
import java.util.*;

/** Verified-stay reviews: one per checked-out booking, public view without personal data, staff reply and moderation. */
final class Reviews extends Feature {
  Reviews(Ledger ledger){super(ledger);}

  /** Only a guest who has checked out may review that stay, once. The public name is the first name only. */
  public JsonObject createReview(User user,JsonObject input) throws SQLException {
    String bookingId=text(input,"bookingId",50);long rating=number(input,"rating");
    if(rating<1||rating>5)throw new Failure(400,"Chọn từ 1 đến 5 sao.");
    String comment=input.has("comment")&&input.get("comment").isJsonPrimitive()?input.get("comment").getAsString().trim():"";
    if(comment.length()>1000)throw new Failure(400,"Nhận xét tối đa 1000 ký tự.");
    return transaction(()->{
      var row=find("stay_bookings",bookingId);if(!row.owner().equals(user.email()))throw new Failure(404,"Không tìm thấy bản ghi.");var b=row.data();
      if(!"CHECKED_OUT".equals(b.get("status").getAsString()))throw new Failure(409,"Chỉ đánh giá sau khi đã trả phòng.");
      try(var s=db.prepareStatement("SELECT 1 FROM stay_reviews WHERE booking_id=?")){s.setString(1,bookingId);try(var r=s.executeQuery()){if(r.next())throw new Failure(409,"Kỳ nghỉ này đã được đánh giá.");}}
      var review=new JsonObject();String id="RV-"+UUID.randomUUID().toString().substring(0,8).toUpperCase(Locale.ROOT);
      String name=user.displayName()==null||user.displayName().isBlank()?"Khách":user.displayName().trim().split("\\s+")[0];
      review.addProperty("id",id);review.addProperty("bookingId",bookingId);review.addProperty("roomId",b.get("roomId").getAsString());review.addProperty("roomName",b.get("roomName").getAsString());
      if(b.has("propertyId"))review.add("propertyId",b.get("propertyId"));
      review.addProperty("rating",rating);review.addProperty("comment",comment);review.addProperty("author",name);review.addProperty("stayMonth",b.get("arrival").getAsString().substring(0,7));
      review.addProperty("status","VISIBLE");review.addProperty("createdAt",System.currentTimeMillis());
      try(var s=db.prepareStatement("INSERT INTO stay_reviews VALUES(?,?,?,?,?,?)")){s.setString(1,id);s.setString(2,user.email());s.setString(3,bookingId);s.setString(4,review.get("roomId").getAsString());s.setString(5,"VISIBLE");s.setString(6,review.toString());s.executeUpdate();}
      event(user.email(),user.email(),bookingId,"REVIEW_CREATED",id+" · "+rating+" sao");return review;
    });
  }
  static JsonObject publicReview(JsonObject review){var out=new JsonObject();for(String f:List.of("id","roomId","rating","comment","author","stayMonth","createdAt"))out.add(f,review.get(f));if(review.has("reply"))out.add("reply",review.get("reply"));return out;}
  /** Public reviews for one room: visible ones only, without booking ids or emails. */
  public JsonObject roomReviews(String roomId) throws SQLException {
    item("rooms",roomId);var list=new JsonArray();long sum=0;
    try(var s=db.prepareStatement("SELECT payload FROM stay_reviews WHERE room_id=? AND status='VISIBLE' ORDER BY rowid DESC")){s.setString(1,roomId);try(var r=s.executeQuery()){while(r.next()){var review=JsonParser.parseString(r.getString(1)).getAsJsonObject();sum+=review.get("rating").getAsLong();list.add(publicReview(review));}}}
    var result=new JsonObject();result.addProperty("roomId",roomId);result.addProperty("count",list.size());if(list.size()>0)result.addProperty("average",Math.round(sum*10.0/list.size())/10.0);result.add("reviews",list);return result;
  }
  public JsonObject reviewSummary() throws SQLException {
    var result=new JsonObject();
    try(var s=db.prepareStatement("SELECT room_id,COUNT(*),AVG(json_extract(payload,'$.rating')) FROM stay_reviews WHERE status='VISIBLE' GROUP BY room_id");var r=s.executeQuery()){
      while(r.next()){var entry=new JsonObject();entry.addProperty("count",r.getInt(2));entry.addProperty("average",Math.round(r.getDouble(3)*10)/10.0);result.add(r.getString(1),entry);}
    }
    return result;
  }
  /** One public reply from the property per review; staff may edit it, the original review text never changes. */
  public JsonObject replyReview(User user,String id,JsonObject input) throws SQLException {
    if(!"admin".equals(user.role()))throw new Failure(403,"Bạn không có quyền quản trị.");
    String text=text(input,"reply",600);
    return transaction(()->{
      var row=find("stay_reviews",id);var review=row.data();var reply=new JsonObject();reply.addProperty("text",text);reply.addProperty("at",System.currentTimeMillis());review.add("reply",reply);
      try(var s=db.prepareStatement("UPDATE stay_reviews SET payload=? WHERE id=?")){s.setString(1,review.toString());s.setString(2,id);s.executeUpdate();}
      event(row.owner(),user.email(),review.get("bookingId").getAsString(),"REVIEW_REPLY",id+" · Cơ sở đã phản hồi đánh giá.");return review;
    });
  }
  public JsonObject moderateReview(User user,String id,JsonObject input) throws SQLException {
    if(!"admin".equals(user.role()))throw new Failure(403,"Bạn không có quyền quản trị.");
    String status=text(input,"status",20),reason=text(input,"reason",240);
    if(!Set.of("VISIBLE","HIDDEN").contains(status))throw new Failure(400,"Trạng thái đánh giá chưa hợp lệ.");
    return transaction(()->{
      var row=find("stay_reviews",id);var review=row.data();review.addProperty("status",status);review.addProperty("moderationReason",reason);review.addProperty("moderatedAt",System.currentTimeMillis());
      try(var s=db.prepareStatement("UPDATE stay_reviews SET status=?,payload=? WHERE id=?")){s.setString(1,status);s.setString(2,review.toString());s.setString(3,id);s.executeUpdate();}
      event(row.owner(),user.email(),review.get("bookingId").getAsString(),"REVIEW_MODERATED",id+" · "+(status.equals("HIDDEN")?"Đã ẩn: ":"Hiện lại: ")+reason);return review;
    });
  }
}
