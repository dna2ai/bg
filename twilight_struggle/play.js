const i_deck = require('./deck');

const scoring_cards = [37, 38, 39, 145, 146, 147, 148];
const scoring_cards_area = ['me', 'a', 'e', 'ca', 'sa', 'af', 'sea'];
const space_op_req = [0, 2, 2, 2, 2, 3, 3, 3, 4];

function build_realign_coup_default_options(deck) {
   const options = {};
   Object.keys(deck.map.item).forEach(x => { options[x] = 1; });
   if (deck.defcon < 5) {
      Object.keys(deck.map.e).forEach(x => { delete options[x]; });
   }
   if (deck.defcon < 4) {
      Object.keys(deck.map.a).forEach(x => { delete options[x]; });
   }
   if (deck.defcon < 3) {
      Object.keys(deck.map.me).forEach(x => { delete options[x]; });
   }
   return options;
}

function s_filter_realign_coup_options(deck, options) {
   // options = {}
   const list = i_deck.deck_list_u_control(deck);
   // 9 北大西洋公约组织
   if (deck.game_buf['9']) {
      list.forEach(x => {
         if (!deck.map.e[x]) return;
         // 13 戴高乐领导法国
         if (x == 28 && deck.game_buf['13']) return; // France
         // 105 德国总统维利·勃兰特
         if (x == 31 && deck.game_buf['105']) return; // West Germany
         delete options[x];
      });
   }
   // 25 美日共同防卫协定
   if (deck.game_buf['25']) delete options[84]; // Japan
   return options;
}
function s_filter_inf_options(deck, options) {
   // options = []
   // 213 切尔诺贝利
   const cid213 = deck.turn_buf['213'];
   if (cid213) {
      options = options.filter(x => !deck.map[cid213.area][x]);
   }
   return options;
}

class Actor {
   constructor(deck, side) { this.deck = deck; this.side = side; }
   init_map() {}
   opval(card) {}
   pick_headline() {}
   pick_round_card() {}
   choose_or_op_event(card) {}
   card_inf(opval, max, options) {}
   card_enemy_inf(opval, max, options) {}
   inf(opval, options) {}
   realign(opval, options) {}
   coup(opval, options) {}
   spacerace(opval) {}

   cid1_cncard_only_asia() {}
   cid3_choose() {}
   cid7_area_choose(cids) {}
   cid19_boycott() {}

   roll_die() {}

   discard_card(cards, num) {}
   draw_card(cards, num) {}
   pick_card_from_discard(cards, num) {}

   // pick_headline()
   // pick_round_card() -> choose_or_op_event()
   //    -> inf(), realign(), coup()
}

class Player extends Actor {
   constructor(deck, side) { super(deck, side); }
}

class RandomBot extends Actor {
   // side = s, u
   constructor(deck, side) { super(deck, side); }
   opval(card) {
      if (!card) return 0;
      let opval = parseInt(card.type.charAt(0), 10);
      const cid14 = this.deck.turn_buf['14'];
      if (cid14 && cid14.target === this.side) opval --;
      const cid34 = this.deck.turn_buf['34'];
      if (cid34 && this.side === 'u') opval ++;
      const cid137 = this.deck.turn_buf['137'];
      if (cid137 && this.side === 's') opval ++;
      if (opval < 1) opval = 1;
      else if (opval > 4) opval = 4;
      return opval;
   }
   init_map() {
      const options = Object.keys(this.side === 's' ? this.deck.map.ee : this.deck.map.we);
      let n = this.side === 's' ? 6 : 7;
      const finf = this.side === 's' ? 's_inf' : 'u_inf';
      while (n --) {
         const i = i_deck.random(options.length);
         const mobj = this.deck.map.item[options[i]];
         mobj[finf] ++;
      }
   }
   pick_headline(opponent_headline) {
      // opponent_headline is null if not known
      const cards = this.side === 's' ? this.deck.s_cards : this.deck.u_cards;
      const i = i_deck.random(cards.length);
      const one = cards[i];
      if (one.id === 30 /*UN intervetion*/) return this.pick_headline(cards);
      cards.splice(i, 1);
      return one;
   }
   pick_round_card() {
      const cards = this.side === 's' ? this.deck.s_cards : this.deck.u_cards;

      // 106 捕熊陷阱
      const cid106 = this.deck.turn_buf['106'];
      // 110 困境
      const cid110 = this.deck.turn_buf['110'];
      let card_lock = !!(
         this.side === 's' ?
         (cid106 && cid106.lock) :
         (cid110 && cid110.lock)
      );
      if (cards.length === 0) {
         if (!card_lock && ((this.side === 's' && this.deck.cncard === 1) || (this.side === 'u' && this.deck.cncard === 3))) {
            if (Math.random() > 0.5) return this.deck.card_pile_all[0];
         }
         return null;
      }
      let i = -1, one = null;
      const scards = cards.filter(x => scoring_cards.includes(x.id));
      if (scards.length === 0 && card_lock) return null;
      if (card_lock || (scards.length > 0 && scards.length >= this.deck.round)) {
         i = i_deck.random(scards.length);
         one = scards[i];
         i = cards.indexOf(one);
      } else {
         let cn = 0;
         if (this.side === 's' && this.deck.cncard === 1) cn = 1;
         else if (this.side === 'u' && this.deck.cncard === 3) cn = 1;
         i = i_deck.random(cards.length+cn);
         one = i === cards.length ? this.deck.card_pile_all[0] : cards[i];
      }
      cards.splice(i, 1);
      return one;
   }
   choose_or_op_event(card) {
      // 1: only event, 2: only op, 3: both event and op
      if (card.type === '0n') return 1;
      const ct = card.type.charAt(1);
      if ('o' === ct) return 1; // cncard
      if (this.side === ct || 'n' === ct) {
         // TODO: 1 or 2
         return 2;
      }
      return 3;
   }
   card_effect_op_actions(card, effect) {
      const opval = effect.opval;
      let actions = effect.action || ['i', 'r', 'c'];
      let area = null;

      // if opval not enough, skip space race action
      let spacelv = 0, spacedid = false;
      const cidsr2 = this.deck.game_buf.sr2;
      const spacebuf = cidsr2 && cidsr2.target === this.side ? 1 : 0;
      if (this.side === 's') {
         spacelv = this.deck.s_space;
         spacedid = this.deck.s_space_n > spacebuf;
      } else {
         spacelv = this.deck.u_space;
         spacedid = this.deck.s_space_n > spacebuf;
      }
      if (spacedid || opval < space_op_req[spacelv]) {
         actions = actions.filter(x => x !== 's');
      }

      // 114 古巴导弹危机
      const cid114 = this.deck.turn_buf['114'];
      if (cid114 && cid114.target === this.side) {
         actions = actions.filter(x => x !== 'c');
      }

      let cmd = actions[i_deck.random(actions.length)];

      // 131 花朵的力量
      if (cmd !== 's' && this.deck.turn_buf['131'] && this.side === 'u') {
         if (card.id === 6 || card.id === 22 || card.id === 139 || card.id === 3 || card.id === 206) this.deck.vp -= 2;
      }

      // 221 尤里和萨曼莎
      if (cmd === 'c' && this.deck.turn_buf['221'] && this.side === 'u') {
         this.deck.vp --;
      }

      if (effect.area) {
         area = {};
         effect.area.forEach(area_code => {
            const ch1st = area_code.charAt(0);
            if (ch1st === '-' || ch1st === '+') {
               if (area_code === '-bf') {
                  Object.keys(this.deck.map.bf).forEach(x => { delete area[x]; });
               } else {
                  const mid = (-parseInt(area_code)) || 0;
                  if (mid) area[mid] = 1;
               }
            } else if (ch1st === '+') {
               if (area_code === '+bf') {
                  Object.keys(this.deck.map.bf).forEach(x => { area[x] = 2; });
                  Object.keys(area).forEach(x => { if (area[x] !== 2) delete area[x]; });
               } else {
                  const mid = (parseInt(area_code)) || 0;
                  if (mid) area[mid] = 1;
               }
            } else {
               Object.keys(this.deck.map[area_code]).forEach(x => { area[x] = 1; });
            }
         });
         area = Object.keys(area);
      }

      let r;
      switch(cmd) {
      case 'i': r = this.inf(opval, area); break;
      case 'r': r = this.realign(opval, area); break;
      case 'c': r = this.coup(opval, area); break;
      case 's': r = this.spacerace(opval); break;
      }
console.log('- effect', this.side, cmd, r, effect.area || '-');
      return [cmd, r, effect.area || '-'];
   }
   card_inf(opval, max, options) {
      const r = [];
      const sign = max > 0 ? 1 : -1;
      max = max > 0 ? max : -max;
      const limit = {};
      if (!options) options = Object.keys(this.deck.map.item);
      options = options.filter(x => x != 1 && x != 34);
      const map_inf_fn = this.side === 's' ? i_deck.s_map_inf : i_deck.u_map_inf;
      while (opval && options.length) {
         const i = i_deck.random(options.length);
         const mid = options[i];
         const mobj = this.deck.map.item[mid];
         map_inf_fn(this.deck, mid);
         r.push(mid);
         limit[mid] = (limit[mid] || 0) + sign;
         if (sign * limit[mid] >= max) options.splice(options.indexOf(mid), 1);
         opval --;
      }
      return r;
   }
   card_enemy_inf(opval, max, options) {
      const r = [];
      const limit = {};
      if (!options) options = Object.keys(this.deck.map.item);
      const einf = this.side === 's' ? 'u_inf' : 's_inf';
      options = options.filter(x => this.deck.map.item[x][einf] > 0);
      while (opval && options.length) {
         const i = i_deck.random(options.length);
         const mid = options[i];
         const mobj = this.deck.map.item[mid];
         mobj[einf] --;
         r.push(mid);
         limit[mid] = (limit[mid] || 0) + 1;
         if (!mobj[einf] || limit[mid] >= max) options.splice(options.indexOf(mid), 1);
         opval --;
      }
      return r;
   }
   inf(opval, options) {
      const r = [];
      if (!options) options = Object.keys(this.deck.map.item);
      if (this.side === 's') options = s_filter_inf_options(this.deck, options);
      const finf = this.side === 's' ? 's_inf' : 'u_inf';
      const einf = this.side === 's' ? 'u_inf' : 's_inf';
      const map_inf_fn = this.side === 's' ? i_deck.s_map_inf : i_deck.u_map_inf;
      while (opval) {
         if (opval === 1) {
            options = options.filter(x => {
               const mobj = this.deck.map.item[x];
               return mobj.stab > mobj[einf] - mobj[finf];
            });
         }
         const i = i_deck.random(options.length);
         const mid = options[i];
         if (mid == 1 || mid == 34) continue;
         const mobj = this.deck.map.item[mid];
         map_inf_fn(this.deck, mid);
         opval -= 1 + (mobj[einf] - mobj[finf] >= mobj.stab ? 1 : 0);
         r.push(mid);
      }

      // 18 越南起义
      if (this.deck.turn_buf['18'] && this.side === 's' && r.reduce((a, x) => a+(this.deck.map.sea[x] ? 0:1), 0) === 0) {
         const bak = this.deck.turn_buf['18'];
         delete this.deck.turn_buf['18'];
         const rx = this.inf(1, Object.keys(this.deck.map.sea));
         if (rx && rx.length) r.push(rx[0]);
         this.deck.turn_buf['18'] = bak;
      }

      return r;
   }
   realign(opval, options) {
      if (options) {
         options = options.reduce((a, x) => { a[x] = 1; return a; }, {});
      } else {
         options = build_realign_coup_default_options(this.deck);
      }
      if (this.side === 's') s_filter_realign_coup_options(this.deck, options);
      const einf = this.side === 's' ? 'u_inf' : 's_inf';
      Object.keys(options).forEach(x => {
         const mobj = this.deck.map.item[x];
         if (!mobj || mobj[einf] <= 0) delete options[x];
      });
      options = Object.keys(options);
      if (options.length === 0) return null;

      const map_realign_fn = this.side === 's' ? i_deck.s_map_realign : i_deck.u_map_realign;
      const r = [];
      const sp = this.deck.s_player;
      const up = this.deck.u_player;
      while (opval --) {
         const i = i_deck.random(options.length);
         const mid = options[i];
         let dieval_s = sp.roll_die();
         let dieval_u = up.roll_die();

         // 211 伊朗门丑闻
         if (this.deck.turn_buf['211']) {
            dieval_u --;
         }

         map_realign_fn(this.deck, dieval_s, dieval_u, mid);
         if (this.deck.map.item[mid][einf] <= 0) {
            options.splice(i, 1);
         }
         r.push(mid);
         if (!options.length) break;
      }

      // 18 越南起义
      if (this.deck.turn_buf['18'] && this.side === 's' && r.reduce((a, x) => a+(this.deck.map.sea[x] ? 0:1), 0) === 0) {
         const bak = this.deck.turn_buf['18'];
         delete this.deck.turn_buf['18'];
         const rx = this.realign(1, Object.keys(this.deck.map.sea));
         if (rx && rx.length) r.push(rx[0]);
         this.deck.turn_buf['18'] = bak;
      }

      return r;
   }
   coup(opval, options) {
      if (options) {
         options = options.reduce((a, x) => { a[x] = 1; return a; }, {});
      } else {
         options = build_realign_coup_default_options(this.deck);
         if (this.deck.defcon < 3) {
            Object.keys(this.deck.map.bf).forEach(x => { delete options[x]; });
         }
      }
      if (this.side === 's') s_filter_realign_coup_options(this.deck, options);
      const einf = this.side === 's' ? 'u_inf' : 's_inf';
      Object.keys(options).forEach(x => {
         const mobj = this.deck.map.item[x];
         if (!mobj || mobj[einf] <= 0) delete options[x];
      });
      options = Object.keys(options);
      if (options.length === 0) return null;

      const i = i_deck.random(options.length);
      const mid = options[i];
      let dieval = this.roll_die();

      // 18 越南起义
      if (this.deck.turn_buf['18'] && this.side === 's' && this.deck.map.sea[mid]) {
         opval ++;
      }
      // 136 战略武器裁减谈判
      if (this.deck.turn_buf['136']) {
         dieval --;
      }
      // 138 拉丁美洲敢死队
      const cid138 = this.deck.turn_buf['138'];
      if (cid138 && (this.deck.map.ca[mid] || this.deck.map.sa[mid])) {
         if (cid138.target === this.side) {
            dieval --;
         } else {
            dieval ++;
         }
      }

      const map_coup_fn = this.side === 's' ? i_deck.s_map_coup : i_deck.u_map_coup;
      map_coup_fn(this.deck, opval, dieval, mid);
      return mid;
   }

   spacerace(opval) {
      // [1] 1-3
      // [2] 1-4
      // [3] 1-3
      // [4] 1-4
      // [5] 1-3
      // [6] 1-4
      // [7] 1-3
      // [8] 1-2
      const dieval = this.roll_die();
      const cur_space = this.side === 's' ? this.deck.s_space : this.deck.u_space;
      if (this.side === 's') this.deck.s_space_n++;
                        else this.deck.u_space_n++;
      let ok = false;
      switch(cur_space) {
      case 0: if (dieval <= 3) ok = true; break;
      case 1: if (dieval <= 4) ok = true; break;
      case 2: if (dieval <= 3) ok = true; break;
      case 3: if (dieval <= 4) ok = true; break;
      case 4: if (dieval <= 3) ok = true; break;
      case 5: if (dieval <= 4) ok = true; break;
      case 6: if (dieval <= 3) ok = true; break;
      case 7: if (dieval <= 2) ok = true; break;
      default: return false;
      }
      if (this.side === 's') {
         if (ok) this.deck.s_space ++;
         this.deck.s_space_n ++;
         i_deck.deck_spacerace_award(this.deck, 's');
      } else {
         if (ok) this.deck.u_space ++;
         this.deck.u_space_n ++;
         i_deck.deck_spacerace_award(this.deck, 'u');
      }
      return ok;
   }

   roll_die() { return i_deck.random(6)+1; }

   cid1_cncard_only_asia() {
      return Math.random() > 0.5;
   }
   cid3_choose() {
      // Pakistan, India
      return Math.random() > 0.5 ? 73 : 74;
   }
   cid7_area_choose(cards) {
      return cards[i_deck.random(cards.length)];
   }
   cid19_boycott() { return Math.random() > 0.5; }
   cid21_reinf_n() { return i_deck.random(5); }
   cid24_choose() { return [39, 40, 41, 42, 43][i_deck.random(5)]; }
   cid26_discard() {
      if (Math.random() > 0.5) return null;
      // TODO: apply turn_buf
      const cards = this.deck.u_cards.filter(x => this.opval(x) >= 3);
      if (!cards.length) return null;
      return cards[i_deck.random(cards.length)];
   }
   cid30_intervetion() {
      const eside = this.side === 's' ? 'u' : 's';
      const cards = (this.side === 's' ? this.deck.s_cards : this.deck.u_cards).filter(x => x.type.charAt(1) === eside);
      if (!cards.length) return null;
      return cards[i_deck.random(cards.length)];
   }
   cid32_remove_inf() {
      if (Math.random() > 0.5) return null; // choose add_inf
      const candidates = Object.keys(this.deck.map.ee).filter(x => this.deck.map.item[x].u_inf > 0);
      const n = candidates.length;
      if (n <= 4) return candidates;
      for (let i = 0; i < n; i++) {
         const i1 = i_deck.random(n);
         const i2 = i_deck.random(n);
         const t = candidates[i1];
         candidates[i1] = candidates[i2];
         candidates[i2] = t;
      }
      return candidates.slice(0, 4);
   }
   cid35_remove_inf() {
      const candidates = Object.keys(this.deck.map.e).filter(x => i_deck.deck_check_control(this.deck, x) <= 0 && this.deck.map.item[x].s_inf > 0);
      if (!candidates.length) return null;
      return candidates[i_deck.random(candidates.length)];
   }
   cid101_discard() {
      const n = this.deck.u_cards.length;
      const c = i_deck.random(n);
      for (let i = 0; i < c; i++) {
         const i1 = i_deck.random(n);
         const i2 = i_deck.random(n);
         const t = this.deck.u_cards[i1];
         this.deck.u_cards[i1] = this.deck.u_cards[i2];
         this.deck.u_cards[i2] = t;
      }
      const cards = this.deck.u_cards.splice(0, c);
      return cards;
   }
   cid103_adjust() {
      if (this.deck.card_pile.length < 5) {
         this.deck.card_pile = i_deck.card_pile_shuffle(this.deck.card_pile.concat(this.deck.discard_pile));
         this.deck.discard_pile = [];
      }
      const cs5 = this.deck.card_pile.splice(0, 5);
      const n = cs5.length;
      const m = i_deck.random(n);
      for (let i = 0; i < 3; i++) {
         const i1 = i_deck.random(n);
         const i2 = i_deck.random(n);
         const t = cs5[i1];
         cs5[i1] = cs5[i2];
         cs5[i2] = t;
      }
      const r = cs5.splice(0, m);
      r.forEach(x => this.deck.discard_pile.push(x));
      this.deck.card_pile = i_deck.card_pile_shuffle(this.deck.card_pile.concat(cs5));
      return r;
   }
   cid106_cid110_buf_discard() {
      const cards = this.side === 's' ? this.deck.s_cards : this.deck.u_cards;
      const candidates = cards.filter(x => this.opval(x) >= 2);
      if (!candidates.length) return null;
      const card = candidates[i_deck.random(candidates.length)];
      cards.splice(cards.indexOf(card), 1);
      return card;
   }
   cid108_choose_max() {
      const cards = this.side === 's' ? this.deck.s_cards : this.deck.u_cards;
      const max = cards.reduce((a, x) => Math.max(this.opval(x), a), 0);
      const candidates = cards.filter(x => this.opval(x) === max);
      return candidates[i_deck.random(candidates.length)];
   }
   cid117_1in2() { return Math.random() > 0.5; }
   cid118_return(card) { return Math.random() > 0.5; }
   cid124_defcon_choose() { return i_deck.random(4)+2; } // 2,3,4,5
   cid125_defcon_move() { return i_deck.random(3)-1; } // -1,0,1
   cid135_choose() {
      // Syria, Iraq, Iran, Egypt, Libya, Jordan, Saudi Arabia, Sudan
      const mids = [45, 47, 48, 49, 50, 51, 53, 71].filter(mid => this.deck.map.item[mid].u_inf > 0);
      if (mids.length === 0) return null;
      if (mids.length <= 2) return mids;
      const r = [mids[i_deck.random(mids.length)]];
      let sec = mids[i_deck.random(mids.length)];
      while (sec === r[0]) sec = mids[i_deck.random(mids.length)];
      r.push(sec);
      return r;
   }
   cid136_choose_discard(cards) { return cards[i_deck.random(cards.length)]; }
   cid139_choose(attack_mids) { return attack_mids[i_deck.random(attack_mids.length)]; }
   cid204_discard(cards) { return cards[i_deck.random(cards.length)]; }
   cid206_choose() { return Math.random() > 0.5 ? 47 : 48; } // Iraq, Iran
   cid213_area_choose() { return scoring_cards_area[i_deck.random(scoring_cards_area.length)]; }
   cid219_choose_discard(cards) { return cards[i_deck.random(cards.length)]; }
   cid222_discard() {
      if (Math.random() > 0.5) return null;
      const cards = this.deck.u_cards.filter(x => this.opval(x) >= 3);
      if (!cards.length) return null;
      return cards[i_deck.random(cards.length)];
   }
   cid222_double() {
      const mids = Object.keys(this.deck.map.sa).filter(x => this.deck.map.item[x].s_inf > 0);
      if (mids.length === 0) return null;
      if (mids.length <= 2) return mids;
      const r = [mids[i_deck.random(mids.length)]];
      let sec = mids[i_deck.random(mids.length)];
      while (sec === r[0]) sec = mids[i_deck.random(mids.length)];
      r.push(sec);
      return r;
   }

   choose_round8() { return Math.random() > 0.5; }
   choose_discard_held() { return Math.random() > 0.5; }
}

module.exports = {
   Player,
   RandomBot,
   scoring_cards,
   scoring_cards_area,
   space_op_req,
   s_filter_realign_coup_options,
   s_filter_inf_options,
};
