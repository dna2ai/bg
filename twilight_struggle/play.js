const i_deck = require('./deck');

const scoring_cards = [37, 38, 39, 145, 146, 147, 148];
const scoring_cards_area = ['me', 'a', 'e', 'ca', 'sa', 'af', 'sea'];

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

class Actor {
   constructor(deck, side) { this.deck = deck; this.side = side; }
   init_map() {}
   opval(card) {}
   pick_headline() {}
   pick_round_card() {}
   choose_or_op_event(card) {}
   choose_or_inf_realign_coup_space(card) {}
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
   //    -> choose_or_inf_realign_coup_space()
   //       -> inf(), realign(), coup()
}

class Player extends Actor {
   constructor(deck, side) { super(deck, side); }
}

class RandomBot extends Actor {
   // side = s, u
   constructor(deck, side) { super(deck, side); }
   opval(card) {
      if (!card) return 0;
      const opval = parseInt(card.type.charAt(0), 10);
      // TODO: opval - turn_buf, game_buf
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
   pick_headline() {
      const cards = this.side === 's' ? this.deck.s_cards : this.deck.u_cards;
      const i = i_deck.random(cards.length);
      const one = cards[i];
      if (one.id === 30 /*UN intervetion*/) return this.pick_headline(cards);
      cards.splice(i, 1);
      return one;
   }
   pick_round_card() {
      const cards = this.side === 's' ? this.deck.s_cards : this.deck.u_cards;
      if (cards.length === 0) {
         if ((this.side === 's' && this.deck.cncard === 1) || (this.side === 'u' && this.deck.cncard === 3)) {
            if (Math.random() > 0.5) return this.deck.card_pile_all[0];
         }
         return null;
      }
      let i = -1, one = null;
      const scards = cards.filter(x => scoring_cards.includes(x.id));
      if (scards.length > 0 && scards.length >= this.deck.round) {
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
   choose_or_inf_realign_coup_space(card) {
      if (card.type === '0n') return null;
      // TODO
      const opval = this.opval(card);
      let n = 4;
      if (this.side === 's') {
         // TODO: apply spacerace-2 effect if has or spacrace max
         if (this.deck.s_space_n >= 1 || opval < 2) n --;
      } else {
         if (this.deck.u_space_n >= 1 || opval < 2) n --;
      }
      const s = i_deck.random(n);
      switch (s) {
      case 0: return 'i';
      case 1: return 'r';
      case 2: return 'c';
      case 3: return 's';
      }
      return null;
   }
   card_effect_op_actions(card, effect) {
      const opval = effect.opval;
      const actions = effect.action || ['i', 'r', 'c'];
      let area = null;
      const cmd = actions[i_deck.random(actions.length)];

      if (effect.area) {
         area = {};
         effect.area.forEach(area_code => {
            Object.keys(this.deck.map[area_code]).forEach(x => { area[x] = 1; });
         });
         area = Object.keys(area);
      }

      let r;
      switch(cmd) {
      case 'i': r = this.inf(opval, area); break;
      case 'r': r = this.realign(opval, area); break;
      case 'c': r = this.coup(opval, area); break;
      }
console.log('- effect', this.side, cmd, r, effect.area || '-');
      return [cmd, r, effect.area || '-'];
   }
   card_inf(opval, max, options) {
      const r = [];
      const limit = {};
      if (!options) options = Object.keys(this.deck.map.item);
      const map_inf_fn = this.side === 's' ? i_deck.s_map_inf : i_deck.u_map_inf;
      while (opval && options.length) {
         const i = i_deck.random(options.length);
         const mid = options[i];
         const mobj = this.deck.map.item[mid];
         map_inf_fn(this.deck, mid);
         r.push(mid);
         limit[mid] = (limit[mid] || 0) + 1;
         if (limit[mid] >= max) options.splice(options.indexOf(mid), 1);
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
         const mobj = this.deck.map.item[mid];
         map_inf_fn(this.deck, mid);
         opval -= 1 + (mobj[einf] - mobj[finf] >= mobj.stab ? 1 : 0);
         r.push(mid);
      }
      return r;
   }
   realign(opval, options) {
      if (options) {
         options = options.reduce((a, x) => { a[x] = 1; return a; }, {});
      } else {
         options = build_realign_coup_default_options(this.deck);
      }
      const einf = this.side === 's' ? 'u_inf' : 's_inf';
      Object.keys(options).forEach(x => {
         const mobj = this.deck.map.item[x];
         if (mobj[einf] <= 0) delete options[x];
      });
      options = Object.keys(options);
      if (options.length === 0) return null;

      const map_realign_fn = this.side === 's' ? i_deck.s_map_realign : i_deck.u_map_realign;
      const r = [];
      while (opval --) {
         const i = i_deck.random(options.length);
         const mid = options[i];
         const dieval_a = i_deck.random(6) + 1;
         const dieval_b = i_deck.random(6) + 1;
         map_realign_fn(this.deck, dieval_a, dieval_b, mid);
         if (this.deck.map.item[mid][einf] <= 0) {
            options.splice(i, 1);
         }
         r.push(mid);
         if (!options.length) break;
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
      const einf = this.side === 's' ? 'u_inf' : 's_inf';
      Object.keys(options).forEach(x => {
         const mobj = this.deck.map.item[x];
         if (mobj[einf] <= 0) delete options[x];
      });
      options = Object.keys(options);
      if (options.length === 0) return null;

      const i = i_deck.random(options.length);
      const mid = options[i];
      const dieval = i_deck.random(6) + 1;
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
   cid7_area_choose(cids) {
      return cids[i_deck.random(cids.length)];
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
}

module.exports = {
   Player,
   RandomBot,
   scoring_cards,
   scoring_cards_area,
};
