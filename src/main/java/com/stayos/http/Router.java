package com.stayos.http;

import com.google.gson.JsonObject;
import com.stayos.auth.AuthService.User;
import com.sun.net.httpserver.HttpExchange;
import java.util.*;
import java.util.regex.*;

/**
 * Route table for the JSON API. Paths are templates such as "/api/support/{id}/messages";
 * each route declares whether it needs a signed-in user and whether it is rate limited (logins, messages, reviews).
 */
public final class Router {
  public enum Access { PUBLIC, SIGNED_IN }
  /** One request as a handler sees it. `user` is null on public routes. */
  public record Call(HttpExchange exchange, JsonObject input, User user, Map<String,String> query, List<String> params) {
    public String param(int index) { return params.get(index); }
    public String query(String name, String fallback) { return query.getOrDefault(name, fallback); }
  }
  @FunctionalInterface public interface Handler { Object handle(Call call) throws Exception; }
  public record Route(String method, String template, Access access, boolean limited, int status, Handler handler) {}
  public record Match(Route route, List<String> params) {}

  private record Compiled(Route route, Pattern pattern) {}
  private final List<Compiled> routes = new ArrayList<>();

  public Router get(String path, Access access, Handler handler) { return add(new Route("GET", path, access, false, 200, handler)); }
  public Router post(String path, Access access, Handler handler) { return add(new Route("POST", path, access, false, 200, handler)); }
  /** POST answering 201 Created. */
  public Router create(String path, Access access, Handler handler) { return add(new Route("POST", path, access, false, 201, handler)); }
  /** Same as the previous route but rate limited per client. */
  public Router limited() {
    var last = routes.remove(routes.size() - 1).route();
    return add(new Route(last.method(), last.template(), last.access(), true, last.status(), last.handler()));
  }
  private Router add(Route route) {
    String regex = Arrays.stream(route.template().split("/", -1)).map(part -> part.matches("\\{\\w+\\}") ? "([^/]+)" : Pattern.quote(part)).reduce((a, b) -> a + "/" + b).orElse("");
    for (var existing : routes) if (existing.route().method().equals(route.method()) && existing.route().template().equals(route.template()))
      throw new IllegalStateException("Duplicate route " + route.method() + " " + route.template());
    routes.add(new Compiled(route, Pattern.compile("^" + regex + "$")));
    return this;
  }
  public Optional<Match> match(String method, String path) {
    for (var compiled : routes) {
      if (!compiled.route().method().equals(method)) continue;
      Matcher m = compiled.pattern().matcher(path);
      if (!m.matches()) continue;
      var params = new ArrayList<String>();
      for (int i = 1; i <= m.groupCount(); i++) params.add(m.group(i));
      return Optional.of(new Match(compiled.route(), List.copyOf(params)));
    }
    return Optional.empty();
  }
  public List<Route> routes() { return routes.stream().map(Compiled::route).toList(); }
}
