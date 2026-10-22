package com.stayos.booking;

import com.google.gson.*;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import static com.stayos.booking.BookingService.*;

/** Server-priced demo offer. No guest-provided prices or benefits are trusted. */
final class BookingOffer {
 private final JsonObject source;
 BookingOffer(){try(var stream=BookingOffer.class.getResourceAsStream("/web/review/offer-v2.json")){
  if(stream==null)throw new IllegalStateException("Missing demo offer");
  source=JsonParser.parseReader(new InputStreamReader(stream,StandardCharsets.UTF_8)).getAsJsonObject();
 }catch(java.io.IOException e){throw new IllegalStateException(e);}}
 private JsonObject find(String list,String id){for(var entry:source.getAsJsonArray(list))if(entry.getAsJsonObject().get("id").getAsString().equals(id))return entry.getAsJsonObject().deepCopy();throw new Failure(400,"Gói hoặc dịch vụ không hợp lệ.");}
 private int integer(JsonObject object,String key,int max){try{int n=object.get(key).getAsBigDecimal().intValueExact();if(n<0||n>max)throw new Exception();return n;}catch(Exception e){throw new Failure(400,"Số lượng dịch vụ chưa hợp lệ.");}}
 JsonObject quote(JsonObject input,JsonObject room,int guests,long nights,String arrival,String departure){
  if(!source.get("revision").equals(input.get("offerVersion")))throw new Failure(409,"Gói đã thay đổi. Tải lại và xem lại lựa chọn.");
  var plan=find("packages",text(input,"planId",30));
  if(!input.has("demoAcknowledged")||!input.get("demoAcknowledged").isJsonPrimitive()||!input.get("demoAcknowledged").getAsJsonPrimitive().isBoolean()||!input.get("demoAcknowledged").getAsBoolean())throw new Failure(400,"Xác nhận đây là đơn mô phỏng, không thu tiền.");
  JsonObject quantities=input.has("quantities")&&input.get("quantities").isJsonObject()?input.getAsJsonObject("quantities"):new JsonObject();
  JsonObject schedules=input.has("schedules")&&input.get("schedules").isJsonObject()?input.getAsJsonObject("schedules"):new JsonObject();
  for(String key:quantities.keySet())find("addons",key);
  long roomTotal=room.get("price").getAsLong()*nights,supplement=plan.get("perGuestNight").getAsLong()*guests*nights,total=roomTotal+supplement;
  var items=new JsonArray();var benefits=new JsonArray();
  var tea=new JsonObject();tea.addProperty("name","Trà chào đón");tea.addProperty("quantity",guests);tea.addProperty("unit","ly / kỳ ở");tea.addProperty("rule",source.getAsJsonObject("benefitRules").get("tea").getAsString());benefits.add(tea);
  if(plan.get("breakfast").getAsBoolean()){var breakfast=new JsonObject();breakfast.addProperty("name","Bữa sáng");breakfast.addProperty("quantity",guests*nights);breakfast.addProperty("unit","suất");breakfast.addProperty("rule",source.getAsJsonObject("benefitRules").get("breakfast").getAsString());benefits.add(breakfast);}
  for(var entry:source.getAsJsonArray("addons")){
   String id=entry.getAsJsonObject().get("id").getAsString();int quantity=quantities.has(id)?integer(quantities,id,6):0;if(quantity==0)continue;
   if(!schedules.has(id)||!schedules.get(id).isJsonObject())throw new Failure(400,"Chọn lịch cho "+entry.getAsJsonObject().get("name").getAsString());
   var service=service(id,quantity,schedules.getAsJsonObject(id),arrival,departure);items.add(service);total+=service.get("price").getAsLong();
  }
  var result=new JsonObject();result.addProperty("version",source.get("revision").getAsString());result.addProperty("demo",true);result.add("plan",plan);result.add("benefits",benefits);result.add("items",items);result.addProperty("supplement",supplement);result.addProperty("roomTotal",roomTotal);result.addProperty("total",total);return result;
 }

 String revision(){return source.get("revision").getAsString();}
 /** Validates one scheduled add-on against the stay and the server clock; the price always comes from the offer file. */
 JsonObject service(String id,int quantity,JsonObject schedule,String arrival,String departure){
  var service=Ledger.bookable(find("addons",id));if(quantity<1||quantity>6)throw new Failure(400,"Số lượng dịch vụ chưa hợp lệ.");
  String date=text(schedule,"date",10),time=text(schedule,"time",5);LocalDate day;LocalTime hour;ZonedDateTime at;
  try{day=LocalDate.parse(date);hour=LocalTime.parse(time);if(!day.toString().equals(date)||!time.matches("[0-2][0-9]:[0-5][0-9]"))throw new Exception();at=day.atTime(hour).atZone(ZONE);}catch(Exception e){throw new Failure(400,"Ngày giờ phục vụ chưa hợp lệ.");}
  int lead=id.equals("dining")?12:24;if(at.toInstant().toEpochMilli()-System.currentTimeMillis()<lead*3600000L)throw new Failure(400,"Dịch vụ cần đặt trước "+lead+" giờ.");
  if(id.equals("transfer")){if(!date.equals(arrival))throw new Failure(400,"Ngày xe đón phải trùng ngày nhận phòng.");String flight=text(schedule,"flight",10);if(!flight.matches("(?i)[A-Z0-9]{2,3} ?[0-9]{1,4}"))throw new Failure(400,"Mã chuyến bay chưa hợp lệ.");}
  else{
   LocalTime min=LocalTime.of(id.equals("dining")?18:id.equals("spa")?9:7,0),max=LocalTime.of(id.equals("dining")?20:id.equals("spa")?17:7,0);
   if(hour.isBefore(min)||hour.isAfter(max))throw new Failure(400,"Giờ phục vụ ngoài khung dịch vụ.");
   var end=at.plusHours(id.equals("spa")?1:id.equals("tour")?3:0);if(at.isBefore(LocalDate.parse(arrival).atTime(14,0).atZone(ZONE))||end.isAfter(LocalDate.parse(departure).atTime(12,0).atZone(ZONE)))throw new Failure(400,"Lịch dịch vụ phải nằm trong kỳ ở.");
  }
  long price=service.get("price").getAsLong();service.addProperty("unitPrice",price);service.addProperty("price",price*quantity);service.addProperty("quantity",quantity);service.addProperty("start",at.toInstant().toEpochMilli());service.add("requestedSchedule",schedule.deepCopy());
  return service;
 }
}
