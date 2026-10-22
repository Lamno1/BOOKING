package com.stayos.booking;

import com.google.gson.*;
import com.stayos.auth.AuthService.User;
import java.sql.*;
import java.time.LocalDate;

/** Base for one feature area: short names for the shared ledger operations so each feature reads like plain domain code. */
abstract class Feature {
  static final java.time.ZoneId ZONE=BookingService.ZONE;
  final Ledger ledger;
  final Connection db;
  final JsonObject inventory;
  Feature(Ledger ledger){this.ledger=ledger;this.db=ledger.db;this.inventory=ledger.inventory;}

  JsonObject item(String list,String id){return ledger.item(list,id);}
  LocalDate date(String value){return ledger.date(value);}
  long nights(String arrival,String departure){return ledger.nights(arrival,departure);}
  JsonObject transaction(Ledger.Work work)throws SQLException{return ledger.transaction(work);}
  JsonArray rows(String table,String owner)throws SQLException{return ledger.rows(table,owner);}
  Ledger.Owned find(String table,String id)throws SQLException{return ledger.find(table,id);}
  void access(User user,Ledger.Owned row){ledger.access(user,row);}
  void event(String owner,String actor,String bookingId,String type,String message)throws SQLException{ledger.event(owner,actor,bookingId,type,message);}
  void saveBooking(String id,JsonObject data)throws SQLException{ledger.saveBooking(id,data);}
  JsonObject roomOperation(String id)throws SQLException{return ledger.roomOperation(id);}
  boolean occupied(String room,String arrival,String departure)throws SQLException{return ledger.occupied(room,arrival,departure);}
  JsonObject insertRequest(String owner,String bookingId,JsonObject service,Long start)throws SQLException{return ledger.insertRequest(owner,bookingId,service,start);}
  void saveRequest(String id,JsonObject q)throws SQLException{ledger.saveRequest(id,q);}
  void saveSupport(JsonObject ticket)throws SQLException{ledger.saveSupport(ticket);}
  static boolean supportOpen(JsonObject ticket){return Ledger.supportOpen(ticket);}
  static String text(JsonObject in,String key,int max){return Ledger.text(in,key,max);}
  static String optionalText(JsonObject in,String key,int max){return Ledger.optionalText(in,key,max);}
  static long number(JsonObject in,String key){return Ledger.number(in,key);}
  static void requireAdmin(User user){Ledger.requireAdmin(user);}
  static JsonObject bookable(JsonObject service){return Ledger.bookable(service);}
}
