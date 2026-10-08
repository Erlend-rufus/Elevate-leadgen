/**
 * Which outcome page a lead goes to. This is the one function to replace when
 * the routing rules arrive: answers in, page name out.
 *
 * The rules were not in the work order and are not guessed. They live as data
 * in routing.json, so supplying them is filling in a table, not editing logic.
 * Until routing.json says "configured", routeLead() throws and the endpoint
 * answers 503, which is the right failure: a lead sent to the wrong page is
 * worse than a form that says something went wrong, because a firm turned
 * away in error, or promised a calendar it should not have, is gone for good.
 *
 * A rule is { id, when: { <choice question id>: [option indexes] }, then: page }.
 * First rule that matches wins. A rule matches when every question named in
 * `when` holds one of the listed indexes. If nothing matches, `fallback`
 * decides, and it is required, so no lead ever lands nowhere by omission.
 */
'use strict';

var PAGES = ['book', 'takk', 'review', 'not-now', 'not-a-fit'];

function RoutingNotConfigured(message) {
  var e = new Error(message || 'routing.json is not configured');
  e.name = 'RoutingNotConfigured';
  return e;
}

/** Everything wrong with a routing table, as sentences. Empty means usable. Used by the build and by routeLead. */
function checkRouting(questions, routing) {
  var problems = [];
  if (!routing || routing.status !== 'configured') {
    problems.push('routing.json status is "' + (routing && routing.status) + '", not "configured"');
    return problems;
  }
  var byId = {};
  questions.forEach(function (q) { byId[q.id] = q; });
  if (!Array.isArray(routing.rules)) problems.push('rules must be an array');
  if (PAGES.indexOf(routing.fallback) === -1) problems.push('fallback must be one of ' + PAGES.join(', ') + ', not ' + JSON.stringify(routing.fallback));
  (routing.rules || []).forEach(function (r, i) {
    var at = 'rules[' + i + ']' + (r && r.id ? ' (' + r.id + ')' : '');
    if (!r || typeof r !== 'object') { problems.push(at + ' is not an object'); return; }
    if (PAGES.indexOf(r.then) === -1) problems.push(at + ' sends to "' + r.then + '", which is not a page');
    if (!r.when || typeof r.when !== 'object' || !Object.keys(r.when).length) {
      problems.push(at + ' has an empty "when", so it would match every lead');
      return;
    }
    Object.keys(r.when).forEach(function (id) {
      var q = byId[id];
      if (!q || q.kind !== 'choice') { problems.push(at + ' tests "' + id + '", which is not a choice question'); return; }
      var list = r.when[id];
      if (!Array.isArray(list) || !list.length) { problems.push(at + ' lists no options for "' + id + '"'); return; }
      list.forEach(function (n) {
        if (typeof n !== 'number' || n % 1 !== 0 || n < 0 || n >= q.options.length)
          problems.push(at + ' lists option ' + JSON.stringify(n) + ' for "' + id + '", which has options 0 to ' + (q.options.length - 1));
      });
    });
  });
  return problems;
}

/** @returns {{page: string, rule: string|null}} rule is the id of the rule that matched, or null for the fallback. */
function routeLead(questions, answers, routing) {
  var problems = checkRouting(questions, routing);
  if (problems.length) throw RoutingNotConfigured('routing is not usable: ' + problems[0]);
  for (var i = 0; i < routing.rules.length; i++) {
    var r = routing.rules[i], hit = true;
    var ids = Object.keys(r.when);
    for (var k = 0; k < ids.length; k++) {
      if (r.when[ids[k]].indexOf(answers[ids[k]]) === -1) { hit = false; break; }
    }
    if (hit) return { page: r.then, rule: r.id || 'rule-' + i };
  }
  return { page: routing.fallback, rule: null };
}

module.exports = { PAGES: PAGES, routeLead: routeLead, checkRouting: checkRouting, RoutingNotConfigured: RoutingNotConfigured };
