const i_map = require('./map');
const i_card = require('./card');
const i_env = require('./env');

function deck_new() {
   const deck = {};
   deck.s_player = null;
   deck.u_player = null;
   deck.map = map_new();
   deck.turn = 0;
   deck.card_pile_all = card_pile_new();
   deck.card_pile = card_pile_shuffle(deck.card_pile_all.filter(x => x.id > 1 && x.id < 100));
   deck.discard_pile = [];
   deck.remove_pile = [];
   deck.pin_pile = [];
   deck.turn_buf = {};
   deck.game_buf = {};
   deck.defcon = 5;
   deck.u_mop = 0;
   deck.s_mop = 0;
   deck.u_space = 0;
   deck.u_space_n = 0;
   deck.s_space = 0;
   deck.s_space_n = 0;
   deck.u_cards = [];
   deck.s_cards = [];
   deck.vp = 0;
   deck.cncard = 1; // 0-disable, 1-s,up, 2-s,down, 3-u,up, 4-u,down
   deck.round = 6;
   deck.gameover = false;
   return deck;
}

function deck_clone(deck) {
   const newdeck = Object.assign({}, deck);
   const cards = {};
   deck.card_pile_all.forEach(x => cards[x.id] = Object.assign({}, x));
   newdeck.card_pile_all = deck.card_pile_all.map(x => cards[x.id]);
   newdeck.card_pile = deck.card_pile.map(x => cards[x.id]);
   newdeck.discard_pile = deck.discard_pile.map(x => cards[x.id]);
   newdeck.remove_pile = deck.remove_pile.map(x => cards[x.id]);
   newdeck.turn_buf = {};
   Object.keys(deck.turn_buf).forEach(x => { newdeck.turn_buf[x] = Object.assign({}, deck.turn_buf[x]) });
   newdeck.game_buf = {};
   Object.keys(deck.game_buf).forEach(x => { newdeck.game_buf[x] = Object.assign({}, deck.game_buf[x]) });
   newdeck.u_cards = deck.u_cards.map(x => cards[x.id]);
   newdeck.s_cards = deck.s_cards.map(x => cards[x.id]);
   const map = {};
   Object.keys(deck.map).forEach(k => { map[k] = {}; });
   Object.keys(deck.map.item).forEach(mid => { map.item[mid] = Object.assign({}, deck.map.item[mid]); });
   Object.keys(map.ca).forEach(mid => { map.ca[mid] = map.item[mid]; });
   Object.keys(map.sa).forEach(mid => { map.sa[mid] = map.item[mid]; });
   Object.keys(map.e).forEach(mid => { map.e[mid] = map.item[mid]; });
   Object.keys(map.we).forEach(mid => { map.we[mid] = map.item[mid]; });
   Object.keys(map.ee).forEach(mid => { map.ee[mid] = map.item[mid]; });
   Object.keys(map.a).forEach(mid => { map.a[mid] = map.item[mid]; });
   Object.keys(map.sea).forEach(mid => { map.sea[mid] = map.item[mid]; });
   Object.keys(map.me).forEach(mid => { map.me[mid] = map.item[mid]; });
   Object.keys(map.af).forEach(mid => { map.af[mid] = map.item[mid]; });
   Object.keys(map.bf).forEach(mid => { map.bf[mid] = map.item[mid]; });
   newdeck.map = map;
   return newdeck;
}

function deck_turn_tick(deck) {
   if (deck.turn >= 10) {
      // I
      // game over
      return;
   }

   deck.turn_buf = {};
   deck.s_space_n = 0;
   deck.u_space_n = 0;

   // E
   const udf = deck.u_mop - deck.defcon;
   const sdf = deck.s_mop - deck.defcon;
   if (udf < 0 && sdf < 0) {
      deck.vp += udf - sdf;
   } else if (udf < 0) {
      deck.vp += udf;
   } else if (sdf < 0) {
      deck.vp -= sdf;
   }

   // F (tournament only), reveal held card

   // G
   if (deck.cncard == 2) deck.cncard = 1;
   else if (deck.cncard == 4) deck.cncard = 3;

   // H
   deck.turn ++;
   if (deck.turn < 4) {
      deck.round = 6;
   } else {
      deck.round = 7;
   }

   // I -----^

   if (deck.turn == 4) {
      deck.card_pile = card_pile_shuffle(
         deck.card_pile.concat(deck.card_pile_all.filter(x => x.id >= 100 && x.id < 200))
      );
   } else if (deck.turn == 7) {
      deck.card_pile = card_pile_shuffle(
         deck.card_pile.concat(deck.card_pile_all.filter(x => x.id >= 200 && x.id < 300))
      );
   }

   // A
   if (deck.defcon < 5) deck.defcon ++;

   // B
   const hand_size = deck.turn < 4 ? 8 : 9;
   const req_card_n = hand_size * 2 - deck.u_cards.length - deck.s_cards.length;
   if (req_card_n > deck.card_pile.length) {
      deck.card_pile = card_pile_shuffle(
         deck.card_pile.concat(deck.discard_pile)
      );
      deck.discard_pile = [];
   }
   let s_ok = false, u_ok = false;
   while (!s_ok || !u_ok) {
      if (!s_ok) {
         if (deck.s_cards.length < hand_size) {
            const one = deck.card_pile.shift();
            deck.s_cards.push(one);
         } else {
            s_ok = true;
         }
      }
      if (!u_ok) {
         if (deck.u_cards.length < hand_size) {
            const one = deck.card_pile.shift();
            deck.u_cards.push(one);
         } else {
            u_ok = true;
         }
      }
   }

   deck.s_space = Math.abs(deck.s_space);
   deck.u_space = Math.abs(deck.u_space);

   // C, D
}

function card_pile_new() {
   const pile = i_card.item.map(x => Object.assign({}, x));
   return pile;
}

function card_pile_shuffle(pile) {
   const n = pile.length;
   const n0 = ~~(n / 2)
   for (let i = 0; i < n0; i++) {
      const i1 = ~~(Math.random() * n);
      const i2 = ~~(Math.random() * n);
      if (i1 == i2) continue;
      const t = pile[i1];
      pile[i1] = pile[i2];
      pile[i2] = t;
   }
   return pile;
}

function map_new() {
   const map = { item: {}, ca: {}, sa: {}, e: {}, we: {}, ee: {}, me: {}, af: {}, a: {}, sea: {}, bf: {}, edge: i_map.edge };
   i_map.area.forEach(one => {
      if (!one.k) return;
      const item = {
         id: one.id,
         name: one.name,
         stab: one.stab,
         bf: one.bf,
         u_inf: 0,
         s_inf: 0,
      };
      map.item[one.id] = item;
      if (one.bf) map.bf[one.id] = item;
      const kps = one.k.split(':');
      kps.forEach(k => {
         map[k][one.id] = item;
      });
   });

   map.item[45].s_inf = 1; // Syria
   map.item[47].s_inf = 1; // Iraq
   map.item[35].s_inf = 1; // Finland
   map.item[37].s_inf = 3; // East Germany (dom)
   map.item[86].s_inf = 3; // North Korea (dom)
   // s_player 6 in ee

   map.item[11].u_inf = 1; // Panama
   map.item[22].u_inf = 2; // Canada
   map.item[23].u_inf = 5; // United Kingdom (dom)
   map.item[46].u_inf = 1; // Israel
   map.item[48].u_inf = 1; // Iran
   map.item[64].u_inf = 1; // South Africa
   map.item[81].u_inf = 1; // Philippines
   map.item[82].u_inf = 4; // Australia (dom)
   map.item[84].u_inf = 1; // Japan
   map.item[85].u_inf = 1; // South Korea
   // u_player 7 in we

   return map;
}

function s_check_dom(deck, mid) {
   const mobj = deck.map.item[mid];
   return mobj.stab <= mobj.s_inf - mobj.u_inf;
}
function u_check_dom(deck, mid) {
   const mobj = deck.map.item[mid];
   return mobj.stab <= mobj.u_inf - mobj.s_inf;
}

function s_count_adjacent_dom(deck, mid) {
   const list = deck.map.edge[mid];
   let count = 0;
   list.forEach(mxid => {
      // usa: 1, ussr: 34
      if (mxid === 34) count ++;
      else if (s_check_dom(deck, mid)) count ++;
   });
   return count;
}
function u_count_adjacent_dom(deck, mid) {
   const list = deck.map.edge[mid];
   let count = 0;
   list.forEach(mxid => {
      // usa: 1, ussr: 34
      if (mxid === 1) count ++;
      else if (u_check_dom(deck, mid)) count ++;
   });
   return count;
}

function random(num) { return ~~(Math.random() * num); }
function roll_die() { return random(6)+1; }
function s_map_inf(deck, mid) {
   deck.map.item[mid].s_inf ++;
}
function s_map_realign(deck, dieval_s, dieval_u, mid) {
   // +1 each for A if dom(target.adjacent, A)
   // +1 for A if A(target.inf) > B(target.inf)
   // +1 for A if dist(target, A) = 1
   const mobj = deck.map.item[mid];
   if (mobj.s_inf > mobj.u_inf) dieval_s ++;
   else if (mobj.s_inf < mobj.u_inf) dieval_u ++;
   dieval_s += s_count_adjacent_dom(deck, mid);
   dieval_u += u_count_adjacent_dom(deck, mid);
   const d = dieval_s - dieval_u;
   if (d > 0) {
      mobj.u_inf -= d;
      if (mobj.u_inf < 0) mobj.u_inf = 0;
   }
   return d > 0;
}
function s_map_coup(deck, opval, dieval, mid) {
   // opval + dieval - mid.stab * 2 > 0
   // mop += opval
   // mid.bf => deck.defcon --
   const mobj = deck.map.item[mid];
   const d = opval + dieval - mid.stab * 2;
   if (d > 0) {
      mobj.u_inf -= d;
      if (mobj.u_inf < 0) {
         mobj.s_inf -= mobj.u_inf;
         mobj.u_inf = 0;
      }
      if (mobj.bf) deck.defcon --;
      mobj.s_mop += opval;
      if (mobj.s_mop > 5) mobj.s_mop = 5;
   }
   return d > 0;
}

function u_map_inf(deck, mid) {
   deck.map.item[mid].u_inf ++;
}
function u_map_realign(deck, dieval_s, dieval_u, mid) {
   // +1 each for A if dom(target.adjacent, A)
   // +1 for A if A(target.inf) > B(target.inf)
   // +1 for A if dist(target, A) = 1
   const mobj = deck.map.item[mid];
   if (mobj.u_inf > mobj.s_inf) dieval_u ++;
   else if (mobj.u_inf < mobj.s_inf) dieval_s ++;
   dieval_u += u_count_adjacent_dom(deck, mid);
   dieval_s += s_count_adjacent_dom(deck, mid);
   const d = dieval_u - dieval_s;
   if (d > 0) {
      mobj.s_inf -= d;
      if (mobj.s_inf < 0) mobj.s_inf = 0;
   }
   return d > 0;
}
function u_map_coup(deck, opval, dieval, mid) {
   // opval + dieval - mid.stab * 2 > 0
   // mop += opval
   // mid.bf => deck.defcon --
   const mobj = deck.map.item[mid];
   const d = opval + dieval - mid.stab * 2;
   if (d > 0) {
      mobj.s_inf -= d;
      if (mobj.s_inf < 0) {
         mobj.u_inf -= mobj.s_inf;
         mobj.s_inf = 0;
      }
      // 144 核潜艇
      if (mobj.bf && deck.turn_buf['144']) deck.defcon --;
      mobj.u_mop += opval;
      if (mobj.u_mop > 5) mobj.u_mop = 5;
   }
   return d > 0;
}

const scoring_card = {
   e: [0, 3, 7, Infinity],
   a: [0, 3, 7, 9],
   me: [0, 3, 5, 7],
   ca: [0, 1, 3, 4],
   sa: [0, 3, 5, 6],
   af: [0, 1, 4, 6],
};

function deck_check_control(deck, mid) {
   if (mid === 1) return -10;
   if (mid === 34) return 10;
   const mobj = deck.map.item[mid];
   const d = mobj.s_inf - mobj.u_inf;
   if (d >= mobj.stab) return 10 + d - mobj.stab;
   if (d <= -mobj.stab) return -10 + d + mobj.stab;
   return 0;
}

function deck_stat_area(deck, area_code) {
   const bf = deck.map.bf;
   const area = deck.map[area_code];
   let u0 = 0, u_bf = 0, s0 = 0, s_bf = 0;
   let ustat = 0, sstat = 0; // 0 = no, 1 = exists, 2 = dom, 3 = control
   const bf_n = Object.keys(area).map(mid => {
      const mobj = area[mid];
      const d = mobj.s_inf - mobj.u_inf;
      const isbf = !!bf[mid];
      if (d >= mobj.stab) {
         if (isbf) s_bf ++; else s0 ++;
         if (deck.map.edge[1].includes(mid)) ss ++;
      } else if (d <= -mobj.stab) {
         if (isbf) u_bf ++; else u0 ++;
         if (deck.map.edge[34].includes(mid)) us ++;
      }
      return isbf ? 1 : 0;
   }).reduce((a, x) => a+x, 0);

   let cid33 = 0;
   if (area_code === 'a') {
      // 33 台湾决议
      if (deck.game_buf['33']) {
         cid33 = 1;
         // Taiwan (China)
         if (deck_check_control(deck, 83) < 0) {
            u_bf ++;
         }
      }
   }
   if (deck.turn <= 10 && area_code === 'a' || area_code === 'me') {
      // 113 穿梭外交
      if (deck.game_buf['113']) {
         s_bf --;
         delete deck.game_buf['113'];
         const cid113 = deck.pin_pile.find(x => x.id === 113);
         deck.pin_pile.splice(deck.pin_pile.indexOf(cid113), 1);
         deck.discard_pile.push(cid113);
      }
   }

   if (s0 + s_bf > u0 + u_bf && s_bf >= bf_n) {
      sstat = 3;
   } else if (u0 + u_bf > s0 + s_bf && u_bf >= bf_n + cid33) {
      ustat = 3;
   } else {
      if (s0 > u0 && s_bf > u_bf) {
         sstat = 2;
      } else if (u0 > s0 && u_bf > s_bf) {
         ustat = 2;
      } else {
         if (s0 + s_bf > 0) sstat = 1;
         if (u0 + u_bf > 0) ustat = 1;
      }
   }
   // stat: 0-no, 1-exist, 2-dom, 3-control
   return [sstat, ustat, s_bf, u_bf, s0, u0];
}
function deck_score_area(deck, area_code) {
   let us = 0, ss = 0;
   const bf = deck.map.bf;
   const area = deck.map[area_code];
   if (area_code === 'sea') {
      Object.keys(area).forEach(mid => {
         const mobj = area[mid];
         const d = mobj.s_inf - mobj.u_inf;
         const isbf = !!bf[mid];
         if (d >= mobj.stab) {
            ss += 1 + (isbf ? 1 : 0);
         } else if (d <= -mobj.stab) {
            us += 1 + (isbf ? 1 : 0);
         }
      });
      deck.vp += us - ss;
if (i_env.debug) console.log('- scoring: sea', 'ss=', ss, 'us=', us, JSON.stringify(deck.map.sea));
      return;
   }

   const stat = deck_stat_area(deck, area_code);

   const sstat = stat[0], ustat = stat[1];
   const s_bf = stat[2], u_bf = stat[3];
   const scard = scoring_card[area_code];
   ss += s_bf + scard[sstat];
   us += u_bf + scard[ustat];

   deck.vp += us - ss;
if (i_env.debug) console.log('- scoring:', area_code, 'ss=', ss, '/', sstat, 'us=', us, '/', ustat, JSON.stringify(deck.map[area_code]));
}

function deck_spacerace_award(deck, side, noaward) {
   // [1]: 2/1
   // [2]: may play 2 space race cards
   // [3]: 2/0
   // [4]: opponent show headline first
   // [5]: 3/1
   // [6]: may discard held card at the end of turn
   // [7]: 4/2
   // [8]: 2/0, may take 8 action rounds
   if (noaward === undefined) noaward = false;
   const fval = side === 's' ? deck.s_space : deck.u_space;
   const eval = side === 's' ? deck.u_space : deck.s_space;
   const vpd = side === 's' ? -1 : 1;
   const eside = side === 's' ? 'u' : 's';
   switch(fval) {
   case 1: {
      if (noaward) break;
      if (fval > eval) {
         deck.vp += vpd * 2;
      } else {
         deck.vp += vpd;
      }
      break; }
   case 2: {
      if (fval > eval) {
         deck.game_buf.sr2 = { target: side };
      } else {
         delete deck.game_buf.sr2;
      }
      break; }
   case 3: {
      if (noaward) break;
      if (fval > eval) {
         deck.vp += vpd * 2;
      }
      break; }
   case 4: {
      if (fval > eval) {
         deck.game_buf.sr4 = { target: side };
      } else {
         delete deck.game_buf.sr4;
      }
      break; }
   case 5: {
      if (noaward) break;
      if (fval > eval) {
         deck.vp += vpd * 3;
      } else {
         deck.vp += vpd;
      }
      break; }
   case 6: {
      if (fval > eval) {
         deck.game_buf.sr6 = { target: side };
      } else {
         delete deck.game_buf.sr6;
      }
      break; }
   case 7: {
      if (noaward) break;
      if (fval > eval) {
         deck.vp += vpd * 4;
      } else {
         deck.vp += vpd * 2;
      }
      break; }
   case 8: {
      if (fval > eval) {
         if (noaward) deck.vp += vpd * 2;
         deck.game_buf.sr8 = { target: side };
      } else {
         delete deck.game_buf.sr8;
      }
      break; }
   }
}

function deck_defcon_set(deck, n) {
   deck.defcon = n;
   if (deck.defcon > 5) deck.defcon = 5;
   if (deck.defcon < 1) deck.defcon = 1;
}

function deck_defcon_inc(deck, n) {
   n = n || 1;
   deck.defcon += n;
   if (deck.defcon > 5) deck.defcon = 5;
}

function deck_defcon_dec(deck, n) {
   n = n || 1;
   deck.defcon -= n;
   if (deck.defcon < 1) deck.defcon = 1;
}

function deck_list_s_control(deck) {
   return Object.keys(deck.map.item).filter(x => {
      if (x == 1 || x == 34) return false;
      if (deck_check_control(deck, x) > 0) return true;
      return false;
   });
}

function deck_list_u_control(deck) {
   return Object.keys(deck.map.item).filter(x => {
      if (x == 1 || x == 34) return false;
      if (deck_check_control(deck, x) < 0) return true;
      return false;
   });
}

function wait_interaction() {
   const ref = {};
   const p = new Promise((r, e) => {
      ref.r = r;
      ref.e = e;
   });
   ref.p = p;
   return ref;
}

module.exports = {
   deck_new,
   deck_clone,
   deck_turn_tick,
   deck_stat_area,
   deck_score_area,
   deck_check_control,
   deck_spacerace_award,
   deck_defcon_set,
   deck_defcon_inc,
   deck_defcon_dec,
   deck_list_s_control,
   deck_list_u_control,
   card_pile_shuffle,
   wait_interaction,
   s_map_inf,
   s_map_realign,
   s_map_coup,
   u_map_inf,
   u_map_realign,
   u_map_coup,
   random,
   roll_die,
};
