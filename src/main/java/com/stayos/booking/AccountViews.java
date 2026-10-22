package com.stayos.booking;

import com.google.gson.*;
import com.stayos.auth.AuthService.User;
import com.stayos.booking.BookingService.Failure;
import java.sql.*;
import java.time.*;
import java.util.*;

/** What one account (or staff) reads: its ledger rows, saved rooms, and staff-only notes. */
final class AccountViews extends Feature {
  AccountViews(Ledger ledger){super(ledger);}

  public JsonObject state(User user, boolean admin) throws SQLException {
    if (admin && !"admin".equals(user.role())) throw new Failure(403,"Bạn không có quyền quản trị.");
    var result = new JsonObject();
    result.add("bookings", rows("stay_bookings",admin ? null : user.email()));
    result.add("requests", rows("stay_requests",admin ? null : user.email()));
    result.add("history", rows("stay_history",admin ? null : user.email()));
    result.add("support", rows("stay_support",admin ? null : user.email()));
    result.add("reviews", rows("stay_reviews",admin ? null : user.email()));
    if(admin)result.add("notes",staffNotes());
    return result;
  }
  /** Internal staff notes, one per booking. Kept in their own table and returned only in the admin state, so no guest response can carry them. */
  JsonObject staffNotes() throws SQLException {
    var notes=new JsonObject();
    try(var s=db.prepareStatement("SELECT booking_id,note,updated_by,updated_at FROM stay_staff_notes");var r=s.executeQuery()){
      while(r.next()){var n=new JsonObject();n.addProperty("note",r.getString(2));n.addProperty("updatedBy",r.getString(3));n.addProperty("updatedAt",r.getLong(4));notes.add(r.getString(1),n);}
    }
    return notes;
  }
  /** Staff only. A blank note removes it. Not written to the guest-visible history. */
  public JsonObject setStaffNote(User user,String bookingId,JsonObject input) throws SQLException {
    if(!"admin".equals(user.role()))throw new Failure(403,"Bạn không có quyền quản trị.");
    String note=optionalText(input,"note",500);
    return transaction(()->{
      find("stay_bookings",bookingId);
      if(note.isEmpty())try(var s=db.prepareStatement("DELETE FROM stay_staff_notes WHERE booking_id=?")){s.setString(1,bookingId);s.executeUpdate();}
      else try(var s=db.prepareStatement("INSERT INTO stay_staff_notes VALUES(?,?,?,?) ON CONFLICT(booking_id) DO UPDATE SET note=excluded.note,updated_by=excluded.updated_by,updated_at=excluded.updated_at")){s.setString(1,bookingId);s.setString(2,note);s.setString(3,user.email());s.setLong(4,System.currentTimeMillis());s.executeUpdate();}
      return staffNotes();
    });
  }
  /** Account wishlist: room ids only, newest first, capped so a client cannot grow it without bound. */
  public JsonObject saved(User user) throws SQLException {
    var rooms=new JsonArray();
    try(var s=db.prepareStatement("SELECT room_id FROM stay_saved WHERE owner=? ORDER BY created_at DESC")){s.setString(1,user.email());try(var r=s.executeQuery()){while(r.next())rooms.add(r.getString(1));}}
    var result=new JsonObject();result.add("rooms",rooms);return result;
  }
  public JsonObject setSaved(User user,JsonObject input) throws SQLException {
    String roomId=text(input,"roomId",40);item("rooms",roomId);
    if(!input.has("saved")||!input.get("saved").isJsonPrimitive()||!input.get("saved").getAsJsonPrimitive().isBoolean())throw new Failure(400,"Thiếu trạng thái lưu.");
    boolean keep=input.get("saved").getAsBoolean();
    transaction(()->{
      if(keep){
        try(var s=db.prepareStatement("SELECT COUNT(*) FROM stay_saved WHERE owner=?")){s.setString(1,user.email());try(var r=s.executeQuery()){r.next();if(r.getInt(1)>=30)throw new Failure(409,"Danh sách đã lưu tối đa 30 phòng.");}}
        try(var s=db.prepareStatement("INSERT OR IGNORE INTO stay_saved VALUES(?,?,?)")){s.setString(1,user.email());s.setString(2,roomId);s.setLong(3,System.currentTimeMillis());s.executeUpdate();}
      }else try(var s=db.prepareStatement("DELETE FROM stay_saved WHERE owner=? AND room_id=?")){s.setString(1,user.email());s.setString(2,roomId);s.executeUpdate();}
      return null;
    });
    return saved(user);
  }
}
