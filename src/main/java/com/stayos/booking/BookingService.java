package com.stayos.booking;

import com.google.gson.*;
import com.stayos.auth.AuthService.User;
import java.sql.*;
import java.time.*;

/**
 * Authoritative booking ledger, the one entry point the HTTP layer uses.
 * Each feature lives in its own class (Rooms, Reservations, ServiceRequests, SupportDesk, Reviews, AccountViews);
 * this facade serialises access because they share one SQLite connection, and every mutation commits with its history entry.
 */
public final class BookingService implements AutoCloseable {
  public static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

  /** A refusal the guest should see: HTTP status plus a Vietnamese message. */
  public static final class Failure extends RuntimeException {
    public final int status;
    public Failure(int status, String message) { super(message); this.status = status; }
  }
  /** Required string field, trimmed, 1..max characters. */
  public static String text(JsonObject in, String key, int max) {
    var value = in.get(key);
    if (value == null || !value.isJsonPrimitive() || !value.getAsJsonPrimitive().isString()) throw new Failure(400, "Thiếu hoặc sai trường " + key);
    String result = value.getAsString().trim();
    if (result.isEmpty() || result.length() > max) throw new Failure(400, "Trường " + key + " chưa hợp lệ.");
    return result;
  }

  private final Ledger ledger;
  private final Rooms rooms;
  private final Reservations reservations;
  private final ServiceRequests services;
  private final SupportDesk support;
  private final Reviews reviews;
  private final AccountViews accounts;

  public BookingService(String url) throws SQLException {
    ledger = new Ledger(url);
    rooms = new Rooms(ledger);
    reservations = new Reservations(ledger);
    services = new ServiceRequests(ledger);
    support = new SupportDesk(ledger, reservations);
    reviews = new Reviews(ledger);
    accounts = new AccountViews(ledger);
  }

  // Rooms and availability (public)
  public synchronized JsonObject availability(String arrival, String departure) throws SQLException { return rooms.availability(arrival, departure); }
  public synchronized JsonObject calendar(String roomId, String from, int days) throws SQLException { return rooms.calendar(roomId, from, days); }
  public synchronized JsonObject operations(User user, String arrival, String departure) throws SQLException { return rooms.operations(user, arrival, departure); }
  public synchronized JsonObject setRoomOperation(User user, JsonObject input) throws SQLException { return rooms.setRoomOperation(user, input); }

  // Account views
  public synchronized JsonObject state(User user, boolean admin) throws SQLException { return accounts.state(user, admin); }
  public synchronized JsonObject saved(User user) throws SQLException { return accounts.saved(user); }
  public synchronized JsonObject setSaved(User user, JsonObject input) throws SQLException { return accounts.setSaved(user, input); }
  public synchronized JsonObject setStaffNote(User user, String bookingId, JsonObject input) throws SQLException { return accounts.setStaffNote(user, bookingId, input); }

  // Reservations
  public synchronized JsonObject create(User user, JsonObject input) throws SQLException { return reservations.create(user, input); }
  public synchronized JsonObject updateArrival(User user, String id, JsonObject input) throws SQLException { return reservations.updateArrival(user, id, input); }
  public synchronized JsonObject transition(User user, String id, String next) throws SQLException { return reservations.transition(user, id, next); }
  public synchronized JsonObject changeQuote(User user, String bookingId, JsonObject input) throws SQLException { return reservations.changeQuote(user, bookingId, input); }

  // Extra services
  public synchronized JsonObject addService(User user, JsonObject input) throws SQLException { return services.addService(user, input); }
  public synchronized JsonObject cancelRequest(User user, String id) throws SQLException { return services.cancelRequest(user, id); }
  public synchronized JsonObject confirmRequest(User user, String id) throws SQLException { return services.confirmRequest(user, id); }

  // Support desk
  public synchronized JsonObject createSupport(User user, JsonObject input) throws SQLException { return support.createSupport(user, input); }
  public synchronized JsonObject replySupport(User user, String id, JsonObject input, boolean admin) throws SQLException { return support.replySupport(user, id, input, admin); }
  public synchronized JsonObject cancelSupport(User user, String id) throws SQLException { return support.cancelSupport(user, id); }
  public synchronized JsonObject decideChange(User user, String id, JsonObject input) throws SQLException { return support.decideChange(user, id, input); }

  // Reviews
  public synchronized JsonObject createReview(User user, JsonObject input) throws SQLException { return reviews.createReview(user, input); }
  public synchronized JsonObject roomReviews(String roomId) throws SQLException { return reviews.roomReviews(roomId); }
  public synchronized JsonObject reviewSummary() throws SQLException { return reviews.reviewSummary(); }
  public synchronized JsonObject replyReview(User user, String id, JsonObject input) throws SQLException { return reviews.replyReview(user, id, input); }
  public synchronized JsonObject moderateReview(User user, String id, JsonObject input) throws SQLException { return reviews.moderateReview(user, id, input); }

  @Override public synchronized void close() throws SQLException { ledger.close(); }
}
