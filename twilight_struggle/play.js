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

function check_game_over(deck, side) {
   if (deck.gameover) return true;
   if (deck.vp >= 20) {
      deck.gameover = true;
      deck.winner = 'u';
      return true;
   }
   if (deck.vp <= -20) {
      deck.gameover = true;
      deck.winner = 's';
      return true;
   }
   if (deck.defcon < 2) {
      deck.gameover = true;
      deck.winner = side === 's' ? 'u' : 's';
      return true;
   }
   return false;
}

// friendly player (fp), enemy player (ep)
function tick_player_round(deck, fp, ep) {
   let card;

   // 106 捕熊陷阱
   const cid106 = deck.turn_buf['106'];
   if (fp === deck.s_player && cid106 && !cid106.lock) {
      const c0 = deck.s_player.cid106_cid110_buf_discard();
      if (c0) {
         deck.discard_pile.push(c0);
         const dieval = deck.s_player.roll_die();
         if (dieval <= 4) delete deck.turn_buf['106'];
      } else cid106.lock = true;
   }

   // 110 困境
   const cid110 = deck.turn_buf['110'];
   if (fp === deck.u_player && cid110 && !cid110.lock) {
      const c0 = deck.u_player.cid106_cid110_buf_discard();
      if (c0) {
         deck.discard_pile.push(c0);
         const dieval = deck.u_player.roll_die();
         if (dieval <= 4) delete deck.turn_buf['110'];
      } else cid110.lock = true;
   }


   // 108 导弹嫉妒
   const cid108 = deck.turn_buf['108'];
   if (cid108) {
      delete deck.turn_buf['108'];
      const cards = fp.side === 's' ? deck.s_cards : deck.u_cards;
      card = cards.find(x => x.id === 108);
      cards.splice(cards.indexOf(card), 1);
   } else card = fp.pick_round_card();

   if (card) play_one_card(deck, fp, ep, card);
}

function play_one_card(deck, fp, ep, card) {
console.log(':', fp.side, card.id, card.type, card.name);
   const opval = fp.opval(card);
   const opev = fp.choose_or_op_event(card);

   // 116 “我们会埋葬你们的”
   if (deck.game_buf['116'] && fp.side === 'u') {
      delete deck.game_buf['116'];
      if (!(card.id === 30 && (opev & 0x01) === 1)) deck.vp -= 3;
   }

   const opevseq = [];
   if (opev & 0x01) opevseq.push(1);
   if (opev & 0x02) opevseq.push(2);
   if (opevseq.length === 2 && Math.random() > 0.5) {
      opevseq[0] = 2;
      opevseq[1] = 1;
   }
   const effect = {};
   while (opevseq.length) {
      const flag = opevseq.pop();
      if (flag === 1 && !effect.opsr) {
         effect.evact = true;
         if (!act_event(deck, fp, ep, card, effect)) {
            effect.evact = false;
            if ((opev & 0x02) === 0) opevseq.push(2);
         }
console.log('- event');
      } else if (flag === 2) {
         effect.opact = true;
         const op = {
            opval: opval,
            side: fp.side,
            action: ['i', 'r', 'c']
         };
         if (!effect.evact) op.action.push('s');
         const r = fp.card_effect_op_actions(card, op);
         if (r[0] === 's') effect.opsr = true;
         if ((opev & 0x01) === 0 || effect.opsr) {
            deck.discard_pile.push(card);
         }
console.log('- op:', r[0], r[1]);
      }
   }
}

function act_event(deck, fp, ep, card, effect) {
   if (!card) return false;
   if (!effect) effect = {};
   const side = fp.side;
   let applied = true;
   // 0=discard, 1=remove, 2=pin, -1=none
   let piletodo = card.name.endsWith('*') ? 1 : 0;
   const finf = side === 's' ? 's_inf' : 'u_inf';
   const einf = side === 's' ? 'u_inf' : 's_inf';
   const eside = side === 's' ? 'u' : 's';
   const vpd = side === 's' ? -1 : 1;
   switch (card.id) {
   case 1: { // 中国牌 ok
      effect.side = side;
      effect.action = ['i', 'r', 'c'];
      if (fp.cid1_cncard_only_asia()) {
         effect.opval = fp.opval(card)+1;
         effect.area = ['a'];
      } else {
         effect.opval = fp.opval(card);
      }
      if (side === 's') {
         deck.cncard = 4;
      } else {
         deck.cncard = 2;
      }
      piletodo = -1;
      delete deck.game_buf['33'];
      // XXX: effect.opval = 4, and random may select 4 asia countries
      //      what a pity to lose 1 opval
      fp.card_effect_op_actions(card, effect);
      break; }
   case 2: { // 禁止核爆试验 ok
      const vp = deck.defcon - 2;
      i_deck.deck_defcon_inc(deck, 2);
      deck.vp += vp * vpd;
      break; }
   case 3: { // 印度-巴基斯坦战争 ok
      const mid = fp.cid3_choose();
      const mobj = deck.map.item[mid];
      let sx = 0, ux = 0;
      deck.map.edge[mid].forEach(x => {
         const d = i_deck.deck_check_control(deck, x);
         if (d === 0) return;
         if (d < 0) ux ++; else sx ++;
      });
      let v;
      if (side === 's') {
         deck.s_mop += 2;
         if (deck.s_mop > 5) deck.s_mop = 5;
         v = fp.roll_die() - ux;
         if (v >= 4) { mobj.s_inf += mobj.u_inf; mobj.u_inf = 0; deck.vp -= 2; }
      } else {
         deck.u_mop += 2;
         if (deck.u_mop > 5) deck.u_mop = 5;
         v = fp.roll_die() - sx;
         if (v >= 4) { mobj.u_inf += mobj.s_inf; mobj.s_inf = 0; deck.vp += 2; }
      }
      break; }
   case 4: { // 社会主义政府 ok
      if (deck.game_buf['201']) {
         applied = false;
         break;
      }
      fp.card_enemy_inf(3, 2, Object.keys(deck.map.we));
      break; }
   case 5: { // 背叛者 ok
      // deck.turn_buf['5'] = {};
      if (!effect.headline && side === 's') {
         deck.vp ++;
      }
      break; }
   case 6: { // 阿拉伯-以色列战争 ok
      // 111 戴维营协议
      if (deck.game_buf['111']) { applied = false; break; }
      const mid = 46;
      const mobj = deck.map.item[mid];
      let ux = 0;
      deck.map.edge[mid].forEach(x => {
         const d = i_deck.deck_check_control(deck, x);
         if (d === 0) return;
         if (d < 0) ux ++;
      });
      const v = fp.roll_die() - ux;
      deck.s_mop += 2;
      if (deck.s_mop > 5) deck.s_mop = 5;
      if (v >= 4) { mobj.s_inf += mobj.u_inf; mobj.u_inf = 0; deck.vp -= 2; }
      break; }
   case 7: { // 剑桥五杰 ok
      if (deck.turn >= 7) { applied = false; break; }
      const sp = deck.s_player;
      const cards = deck.u_cards.filter(x => scoring_cards.includes(x.id));
      if (cards.length) {
         const area = scoring_cards_area[scoring_cards.indexOf(sp.cid7_area_choose(cards).id)];
         sp.card_inf(1, 1, Object.keys(deck.map[area]));
      }
      break; }
   case 8: { // 东欧剧变 ok
      const up = deck.u_player;
      const mids = up.card_enemy_inf(3, 1, Object.keys(deck.map.ee));
      if (deck.turn >= 7) {
         mids.forEach(x => {
            const mobj = deck.map.item[x];
            if (mobj.s_inf > 0) mobj.s_inf --;
         });
      }
      break; }
   case 9: { // 北大西洋公约组织 * ok
      // 31 马歇尔计划, 32 华沙条约组织成立
      if (!deck.game_buf['31'] && !deck.game_buf['32']) {
         applied = false;
         break;
      }
      deck.game_buf['9'] = {};
      break; }
   case 10: { // 美英特殊关系 ok
      if (i_deck.deck_check_control(deck, 23) >= 0) { applied = false; break; }
      const cid9 = deck.game_buf['9'];
      const up = deck.u_player;
      if (cid9) {
         deck.vp += 2;
         const mids = up.card_inf(1, 1, Object.keys(deck.map.we));
         const mid = mids[0];
         const mobj = deck.map.item[mid];
         if (mobj) mobj.u_inf ++;
      } else {
         up.card_inf(1, 1, deck.map.edge[23]);
      }
      break; }
   case 11: { // 五年计划 ok
      if (!deck.s_cards.length) {
         applied = false;
         break;
      }
      const c0 = deck.s_cards[i_deck.random(deck.s_cards.length)];
      effect.discard = [c0.id];
      if (c0.type.charAt(1) === 'u') {
         const effect0 = {};
         act_event(deck, fp, ep, c0, effect0);
      } else {
         deck.s_cards.splice(deck.s_cards.indexOf(c0), 1);
         deck.discard_pile.push(c0);
      }
      break; }
   case 12: { // 躲避与掩护 ok
      i_deck.deck_defcon_dec(deck, 1);
      deck.vp += 5 - deck.defcon;
      break; }
   case 13: { // 戴高乐领导法国 * ok
      const mobj = deck.map.item[28];
      mobj.u_inf -= 2;
      if (mobj.u_inf < 0) mobj.u_inf = 0;
      mobj.s_inf ++;
      deck.game_buf['13'] = {};
      break; }
   case 14: { // 红色恐怖/清洗 ok
      deck.turn_buf['14'] = { target: eside };
      break; }
   case 15: { // 去殖民地化 ok
      const sp = deck.s_player;
      sp.card_inf(4, 1, Object.keys(deck.map.af).concat(Object.keys(deck.map.sea)));
      break; }
   case 16: { // 罗马尼亚颠覆 ok
      const mobj = deck.map.item[41];
      mobj.u_inf = 0;
      if (mobj.s_inf < mobj.stab) mobj.s_inf = mobj.stab;
      break; }
   case 17: { // 逮捕纳粹科学家 * ok
      if (side === 's') {
         if (deck.s_space === 8) { applied = false; break; }
         deck.s_space ++;
         i_deck.deck_spacerace_award(deck, 's');
      } else {
         if (deck.u_space === 8) { applied = false; break; }
         deck.u_space ++;
         i_deck.deck_spacerace_award(deck, 'u');
      }
      break; }
   case 18: { // 越南起义 * ok
      const mobj = deck.map.item[78];
      mobj.s_inf += 2;
      deck.turn_buf['18'] = {};
      break; }
   case 19: { // 奥运会 ok
      const boycott = ep.cid19_boycott();
      if (boycott) {
         i_deck.deck_defcon_dec(deck, 1);
         effect.opval = fp.opval({ type: '4x' });
         effect.side = side;
         effect.action = ['i', 'r', 'c', 's'];
         fp.card_effect_op_actions(card, effect);
      } else {
         let v1 = 0, v2 = 0;
         while (v1 === v2) {
            v1 = fp.roll_die() + 2;
            v2 = ep.roll_die();
         }
         if (v1 < v2) {
            if (side === 's') deck.vp += 2; else deck.vp -= 2;
         } else {
            if (side === 's') deck.vp -= 2; else deck.vp += 2;
         }
      }
      break; }
   case 20: { // 菲德尔·卡斯特罗 * ok
      const mobj = deck.map.item[4]; // Cuba
      mobj.u_inf = 0;
      if (mobj.s_inf < mobj.stab) mobj.s_inf = mobj.stab;
      break; }
   case 21: { // 去斯大林化 * ok
      const sp = deck.s_player;
      const n = sp.cid21_reinf_n();
      sp.card_inf(n, -2, Object.keys(deck.map.item).filter(x => deck.map.item[x].s_inf > 0));
      sp.card_inf(n, 2, Object.keys(deck.map.item).filter(x => i_deck.deck_check_control(deck, x) >= 0));
      break; }
   case 22: { // 朝鲜战争 * ok
      const mid = 85;
      const mobj = deck.map.item[mid];
      let ux = 0;
      deck.map.edge[mid].forEach(x => {
         const d = i_deck.deck_check_control(deck, x);
         if (d === 0) return;
         if (d < 0) ux ++;
      });
      const v = fp.roll_die() - ux;
      deck.s_mop += 2;
      if (deck.s_mop > 5) deck.s_mop = 5;
      if (v >= 4) { mobj.s_inf += mobj.u_inf; mobj.u_inf = 0; deck.vp -= 2; }
      break; }
   case 23: { // 经济互助委员会 * ok
      const sp = deck.s_player;
      sp.card_inf(4, 1, Object.keys(deck.map.ee).filter(x => i_deck.deck_check_control(deck, x) >= 0));
      break; }
   case 24: { // 独立的红色 * ok
      const up = deck.u_player;
      const mid = up.cid24_choose();
      const mobj = deck.map.item[mid];
      if (mobj.u_inf < mobj.s_inf) {
         mobj.u_inf = mobj.s_inf;
      }
      break; }
   case 25: { // 美日共同防卫协定 * ok
      const mobj = deck.map.item[84];
      const d = mobj.u_inf - mobj.s_inf;
      if (d < mobj.stab) mobj.u_inf += mobj.stab - d;
      deck.game_buf['25'] = {};
      break; }
   case 26: { // 封锁 * ok
      const up = deck.u_player;
      const c0 = up.cid26_discard();
      if (c0) {
         deck.u_cards.splice(deck.u_cards.indexOf(c0), 1);
         deck.discard_pile.push(c0);
      } else {
         deck.map.item[31].u_inf = 0; // west germany
      }
      break; }
   case 27: { // 埃及总统纳赛尔 * ok
      const mobj = deck.map.item[49];
      mobj.s_inf += 2;
      mobj.u_inf = ~~(mobj.u_inf / 2);
      break; }
   case 28: { // 建立中情局 * ok
      // memorize s_cards for u_player
      const up = deck.u_player;
      effect.s_cards = deck.s_cards;
      effect.side = 'u';
      effect.opval = up.opval(card);
      effect.action = ['i', 'r', 'c', 's'];
      up.card_effect_op_actions(card, effect);
      break; }
   case 29: { // 苏伊士运河危机 * ok
      const sp = deck.s_player;
      // UK, France, Israel
      sp.card_enemy_inf(4, 2, [23, 28, 46]);
      break; }
   case 30: { // 联合国干预 ok
      const c0 = fp.cid30_intervetion();
      if (!c0) { applied = false; break; }

      // 107 U-2侦察机事件
      if (deck.turn_buf['107']) deck.vp --;

      const cards = side === 's' ? deck.s_cards : deck.u_cards;
      cards.splice(cards.indexOf(c0), 1);
      deck.discard_pile.push(c0);
      effect.opval = fp.opval(c0);
      effect.side = side;
      fp.card_effect_op_actions(card, effect);
      break; }
   case 31: { // 马歇尔计划 * ok
      const up = deck.u_player;
      up.card_inf(7, 1, Object.keys(deck.map.we).filter(x => i_deck.deck_check_control(deck, x) <= 0));
      deck.game_buf['31'] = {};
      break; }
   case 32: { // 华沙条约组织成立 * ok
      const sp = deck.s_player;
      const mids = sp.cid32_remove_inf()
      if (mids) {
         mids.forEach(x => { deck.map.item[x].u_inf = 0; });
      } else {
         sp.card_inf(5, 2, Object.keys(deck.map.ee));
      }
      deck.game_buf['32'] = {};
      break; }
   case 33: { // 台湾决议 * ok
      deck.game_buf['33'] = {};
      break; }
   case 34: { // 遏制计划 * ok
      deck.turn_buf['34'] = {};
      break; }
   case 35: { // 杜鲁门主义 * ok
      const up = deck.u_player;
      const mid = up.cid35_remove_inf();
      if (!mid) { applied = false; break; }
      deck.map.item[mid].s_inf = 0;
      break; }
   case 36: { // 北美防空司令部 * ok
      deck.game_buf['36'] = {};
      break; }
   case 37: { // 中东计分 ok
      i_deck.deck_score_area(deck, 'me');
      break; }
   case 38: { // 亚洲计分 ok
      i_deck.deck_score_area(deck, 'a');
      break; }
   case 39: { // 欧洲计分 ok
      i_deck.deck_score_area(deck, 'e');
      break; }
   case 101: { // “不要问你的国家能为你做什么……” * ok
      const up = deck.u_player;
      const list = up.cid101_discard();
      let n = list.length;
      if (deck.card_pile.length < n) {
         deck.card_pile = i_deck.card_pile_shuffle(deck.card_pile.concat(deck.discard_pile));
         deck.discard_pile = [];
      }
      // XXX: not sure it happens before shuffle or here
      list.forEach(x => deck.discard_pile.push(x));
      while (n--) {
         const one = deck.card_pile.shift();
         deck.s_cards.push(one);
      }
      break; }
   case 102: { // 美洲进步同盟 * ok
      let u_vp = 0;
      Object.keys(deck.map.ca).forEach(mid => {
         if (i_deck.deck_check_control(deck, mid) < 0 && deck.map.bf[mid]) {
            u_vp ++;
         }
      });
      deck.vp += u_vp;
      break; }
   case 103: { // 我们的人在德黑兰 * ok
      let ok = false;
      Object.keys(deck.map.me).forEach(mid => {
         if (ok) return;
         if (i_deck.deck_check_control(deck, mid) < 0) ok = true;
      });
      if (!ok) { applied = false; break; }
      const up = deck.u_player;
      effect.discard = up.cid103_adjust();
      break; }
   case 104: { // 傀儡政府 * ok
      const mids = Object.keys(deck.map.item).filter(x => {
         const mobj = deck.map.item[x];
         return mobj.s_inf === 0 && mobj.u_inf === 0;
      });
      const up = deck.u_player;
      up.card_inf(3, 1, mids);
      break; }
   case 105: { // 德国总统维利·勃兰特 * ok
      // 210 推倒柏林墙
      if (deck.game_buf['210']) {
         applied = false;
         break;
      }
      const mobj = deck.map.item[31]; // West Germany
      mobj.s_inf ++;
      deck.vp --;
      deck.game_buf['105'] = {};
      break; }
   case 106: { // 捕熊陷阱 * ok
      deck.turn_buf['106'] = {};
      break; }
   case 107: { // U-2侦察机事件 * ok
      deck.vp --;
      deck.turn_buf['107'] = {};
      break; }
   case 108: { // 导弹嫉妒 ok
      const ecards = side === 's' ? deck.u_cards : deck.s_cards;
      if (!ecards.length) {
         applied = false;
         break;
      }
      const c0 = ep.cid108_choose_max();
      if (c0.type.charAt(1) === side) {
         const c0effect = {};
         act_event(deck, fp, ep, c0, c0effect);
      } else {
         effect.opval = fp.opval(c0);
         effect.side = side;
         fp.card_effect_op_actions(card, effect);
      }
      piletodo = -1;
      ecards.push(card);
      const cid108 = deck.turn_buf['108'];
      if (!cid108) deck.turn_buf['108'] = {};
      break; }
   case 109: { // 军备竞赛 ok
      if (deck.s_mop > deck.u_mop) {
         deck.vp --;
         if (deck.s_mop >= deck.defcon) deck.vp -= 2;
      } else if (deck.u_mop > deck.s_mop) {
         deck.vp ++;
         if (deck.u_mop >= deck.defcon) deck.vp += 2;
      }
      break; }
   case 110: { // 困境 * ok
      deck.turn_buf['110'] = {};
      delete deck.game_buf['36'];
      break; }
   case 111: { // 戴维营协议 * ok
      deck.vp ++;
      // Israel, Egypt, Jordan
      [46, 49, 51].forEach(mid => { deck.map.item[mid].u_inf ++; });
      deck.game_buf['111'] = {};
      break; }
   case 112: { // 独行枪手 * ok
      // TODO: memorize u_cards for s_player
      effect.u_cards = deck.u_cards;
      const sp = deck.s_player;
      effect.u_cards = deck.u_cards;
      effect.opval = sp.opval(card);
      effect.side = 's';
      effect.action = ['i', 'r', 'c', 's'];
      sp.card_effect_op_actions(card, effect);
      break; }
   case 113: { // 穿梭外交 ok
      deck.game_buf['113'] = { once: true };
      piletodo = 2;
      break; }
   case 114: { // 古巴导弹危机 * ok
      i_deck.deck_defcon_set(deck, 2);
      deck.turn_buf['114'] = { target: eside };
      break; }
   case 115: { // 石油输出国组织 ok
      // 208 北海石油
      if (deck.game_buf['208']) {
         applied = false;
         break;
      }
      let s_vp = 0;
      // Venezuela, Iraq, Iran, Egypt, Libya, Gulf States, Saudi Arabia
      [12, 47, 48, 49, 50, 52, 53].forEach(mid => {
         if (i_deck.deck_check_control(deck, mid) < 0) s_vp ++;
      });
      deck.vp -= s_vp;
      break; }
   case 116: { // “我们会埋葬你们的” * ok
      i_deck.deck_defcon_dec(deck, 1);
      deck.game_buf['116'] = { once: true };
      break; }
   case 117: { // 南非动荡 ok
      const sp = deck.s_player;
      const mobj = deck.map.item[64];
      if (sp.cid117_1in2()) {
         mobj.s_inf += 2;
      } else {
         mobj.s_inf ++;
         deck.map.edge[64].forEach(mid => {
            deck.map.item[mid].s_inf += 2;
         });
      }
      break; }
   case 118: { // 向苏联出售谷物 ok
      const c0 = deck.s_cards[i_deck.random(deck.s_cards.length)];
      if (!c0) {
         applied = false;
         break;
      }
      const up = deck.u_player;
      if (up.cid118_return(c0)) {
         applied = false;
         break;
      }
      deck.s_cards.splice(deck.s_cards.indexOf(c0), 1);
      play_one_card(deck, fp, ep, c0);
      break; }
   case 119: { // “一小步……” ok
      const fsr = side === 's' ? 's_space' : 'u_space';
      const esr = side === 's' ? 'u_space' : 's_space';
      if (deck[fsr] >= deck[esr]) { applied = false; break; }
      deck[fsr] ++;
      i_deck.deck_spacerace_award(deck, side, true);
      if (deck[fsr] < 8) {
         deck[fsr] ++;
         i_deck.deck_spacerace_award(deck, side);
      }
      break; }
   case 120: { // 智利总统阿言德 * ok
      const mobj = deck.map.item[20];
      mobj.s_inf += 2;
      break; }
   case 121: { // 尼克松访华 * ok
      if (deck.cncard === 3 || deck.cncard === 4) {
         deck.vp += 2;
      } else if (deck.cncard > 0) {
         deck.cncard = 4;
      }
      break; }
   case 122: { // 葡萄牙王国崩溃 * ok
      // Angola, SE Africa States
      [63, 67].forEach(mid => { deck.map.item[mid].s_inf += 2; });
      break; }
   case 123: { // 归还巴拿马运河 * ok
      // Costa Rica, Panama, Venezuela
      [8, 11, 12].forEach(mid => { deck.map.item[mid].u_inf ++; });
      break; }
   case 124: { // 我们学会不再担忧 * ok
      i_deck.deck_defcon_set(deck, fp.cid124_defcon_choose());
      if (side === 's') deck.s_mop = 5; else deck.u_mop = 5;
      break; }
   case 125: { // 首脑会议 ok
      let ss = 0, us = 0;
      ['a', 'e', 'af', 'ca', 'sa', 'me'].forEach(area_code => {
         const stat = i_deck.deck_stat_area(deck, area_code);
         if (stat[0] >= 2) ss++;
         if (stat[1] >= 2) us++;
      });
      const sp = deck.s_player;
      const up = deck.u_player;
      ss += sp.roll_die();
      us += sp.roll_die();
      if (ss === us) break;
      let move = 0;
      if (ss > us) {
         deck.vp -= 2;
         move = sp.cid125_defcon_move();
      } else {
         deck.vp += 2;
         move = up.cid125_defcon_move();
      }
      if (move > 0) {
         i_deck.deck_defcon_inc(deck, 1);
      } else if (move < 0) {
         i_deck.deck_defcon_dec(deck, 1);
      }
      break; }
   case 126: { // 厨房辩论 * ok
      const p = Object.keys(deck.map.bf).map(mid => {
         const d = i_deck.deck_check_control(deck, mid);
         if (d > 0) return -1;
         if (d < 0) return 1;
         return 0;
      }).reduce((a, x) => a+x, 0);
      if (p > 0) deck.vp += 2;
      break; }
   case 127: { // 军事独裁 ok
      const mids = fp.card_inf(1, 1, Object.keys(deck.map.ca).concat(Object.keys(deck.map.sa)));
      const mobj = mids[0];
      if (!mobj) { applied = false; break; }
      mobj[side === 's' ? 's_inf' : 'u_inf'] ++;
      effect.opval = fp.opval(card);
      effect.side = side;
      effect.action = ['r', 'c'];
      effect.area = ['ca', 'sa'];
      fp.card_effect_op_actions(card, effect);
      break; }
   case 128: { // 乌苏里江冲突 * ok
      if (deck.cncard === 2) deck.cncard === 1;
      else if (deck.cncard === 3 || deck.cncard === 4) {
         const up = deck.u_player;
         up.card_inf(4, 2, Object.keys(deck.map.a));
      }
      break; }
   case 129: { // 殖民后卫 ok
      const up = deck.u_player;
      up.card_inf(4, 1, Object.keys(deck.map.af)).concat(Object.keys(deck.map.sea));
      break; }
   case 130: { // 解放神学 ok
      const sp = deck.s_player;
      sp.card_inf(3, 2, Object.keys(deck.map.ca));
      break; }
   case 131: { // 花朵的力量 * ok
      if (deck.game_buf['216']) {
         applied = false;
         break;
      }
      deck.game_buf['131'] = {};
      break; }
   case 132: { // 反弹道导弹条约 ok
      i_deck.deck_defcon_inc(deck, 1);
      effect.opval = fp.opval(card);
      effect.side = side;
      effect.action = ['i', 'r', 'c', 's'];
      fp.card_effect_op_actions(card, effect);
      break; }
   case 133: { // 美国之音 ok
      const up = deck.u_player;
      up.card_enemy_inf(4, 2, Object.keys(deck.map.item).filter(x => !deck.map.e[x]));
      break; }
   case 134: { // 切·格瓦拉 ok
      const sp = deck.s_player;
      const snapshot = {};
      Object.values(deck.map.ca).forEach(x => { snapshot[x.id] = x.u_inf; });
      Object.values(deck.map.sa).forEach(x => { snapshot[x.id] = x.u_inf; });
      effect.opval = fp.opval(card);
      effect.side = side;
      effect.action = ['c'];
      effect.area = ['ca', 'sa', '-bf'];
      const r1 = sp.card_effect_op_actions(card, effect);
      const mid = r1[1];
      const mobj = deck.map.item[mid];
      if (mobj && snapshot[mid] > mobj.u_inf) {
         effect.area.push(`-${mid}`);
         sp.card_effect_op_actions(card, effect);
      }
      break; }
   case 135: { // 穆斯林起义 ok
      // 202 向沙特阿拉伯出售机载空中警报控制系统
      if (deck.game_buf['202']) {
         applied = false;
         break;
      }
      const sp = deck.s_player;
      const mids = sp.cid135_choose();
      if (!mids) { applied = false; break; }
      mids.forEach(x => { deck.map.item[x].u_inf = 0; });
      break; }
   case 136: { // 战略武器裁减谈判 * ok
      i_deck.deck_defcon_inc(deck, 2);
      deck.turn_buf['136'] = {};
      const c0 = fp.cid136_choose_discard(deck.discard_pile.filter(x => x.type !== '0n'));
      if (c0) {
         deck.discard_pile.splice(deck.discard_pile.indexOf(c0), 1);
         (side === 's' ? deck.s_cards : deck.u_cards).push(c0);
         effect.pick = [c0.id];
      }
      break; }
   case 137: { // 勃列日涅夫主义 * ok
      deck.turn_buf['137'] = {};
      break; }
   case 138: { // 拉丁美洲敢死队 ok
      deck.turn_buf['138'] = { target: eside };
      break; }
   case 139: { // 局部战争 ok
      const choices = {};
      Object.keys(deck.map.item).forEach(x => {
         if (x == 1 || x == 34) return;
         if (deck.map.item[x].stab > 2) return;
         choices[x] = 1;
      });
      // 9 北大西洋公约组织 (us controled), except ...
      if (side === 's') s_filter_realign_coup_options(deck, choices);
      const mid = fp.cid139_choose(Object.keys(choices));
      const mobj = deck.map.item[mid];
      let sx = 0, ux = 0;
      deck.map.edge[mid].forEach(x => {
         const d = i_deck.deck_check_control(deck, x);
         if (d === 0) return;
         if (d < 0) ux ++; else sx ++;
      });
      let v;
      if (side === 's') {
         deck.s_mop += 3;
         if (deck.s_mop > 5) deck.s_mop = 5;
         v = fp.roll_die() - ux;
         if (v >= 3) { mobj.s_inf += mobj.u_inf; mobj.u_inf = 0; deck.vp --; }
      } else {
         deck.u_mop += 3;
         if (deck.u_mop > 5) deck.u_mop = 5;
         v = fp.roll_die() - sx;
         if (v >= 3) { mobj.u_inf += mobj.s_inf; mobj.s_inf = 0; deck.vp ++; }
      }
      break; }
   case 140: { // 文化大革命 * ok
      if (deck.cncard === 4) deck.cncard = 3;
      else if (deck.cncard === 1 || deck.cncard === 2) deck.vp --;
      break; }
   case 141: { // 埃及总统萨达特驱逐苏维埃 * ok
      const mobj = deck.map.item[49];
      mobj.s_inf = 0;
      mobj.u_inf ++;
      break; }
   case 142: { // 美洲国家组织创立 * ok
      const up = deck.u_player;
      up.card_inf(2, 2, Object.keys(deck.map.ca).concat(Object.keys(deck.map.sa)));
      break; }
   case 143: { // 约翰·保罗二世当选教皇 * ok
      const mobj = deck.map.item[38];
      mobj.s_inf -= 2;
      if (mobj.s_inf < 0) mobj.s_inf = 0;
      mobj.u_inf ++;
      deck.game_buf['143'] = {};
      break; }
   case 144: { // 核潜艇 * ok
      deck.turn_buf['144'] = {};
      break; }
   case 145: { // 中美洲计分
      i_deck.deck_score_area(deck, 'ca');
      break; }
   case 146: { // 南美洲计分
      i_deck.deck_score_area(deck, 'sa');
      break; }
   case 147: { // 非洲计分
      i_deck.deck_score_area(deck, 'af');
      break; }
   case 148: { // 东南亚计分
      i_deck.deck_score_area(deck, 'sea');
      break; }
   case 201: { // 铁娘子 * ok
      deck.vp ++;
      deck.map.item[21].s_inf ++; // Argentina
      deck.map.item[23].s_inf = 0; // UK
      deck.game_buf['201'] = {};
      break; }
   case 202: { // 向沙特阿拉伯出售机载空中警报控制系统 * ok
      deck.map.item[53].u_inf += 2;
      deck.game_buf['202'] = {};
      break; }
   case 203: { // 战争游戏 * ok
      if (deck.defcon > 2) { applied = false; break; }
      if (side === 's') {
         deck.vp += 6;
      } else {
         deck.vp -= 6;
      }
      deck.gameover = true;
      break; }
   case 204: { // 奥德里奇·艾姆斯 * ok
      const sp = deck.s_player;
      const c0 = sp.cid204_discard(deck.u_cards);
      if (!c0) { applied = false; break; }
      deck.u_cards.splice(deck.u_cards.indexOf(c0), 1);
      deck.discard_pile.push(c0);
      break; }
   case 205: { // 开放 * ok
      deck.vp -= 2;
      i_deck.deck_defcon_inc(deck, 1);
      // 209 改革家
      if (deck.game_buf['209']) {
         const sp = deck.s_player;
         effect.opval = sp.opval(card);
         effect.side = 's';
         effect.action = ['i', 'r'];
         sp.card_effect_op_actions(card, effect);
      }
      break; }
   case 206: { // 两伊战争 * ok
      const mid = fp.cid206_choose();
      const mobj = deck.map.item[mid];
      let sx = 0, ux = 0;
      deck.map.edge[mid].forEach(x => {
         const d = i_deck.deck_check_control(deck, x);
         if (d === 0) return;
         if (d < 0) ux ++; else sx ++;
      });
      let v;
      if (side === 's') {
         deck.s_mop += 2;
         if (deck.s_mop > 5) deck.s_mop = 5;
         v = fp.roll_die() - ux;
         if (v >= 4) { mobj.s_inf += mobj.u_inf; mobj.u_inf = 0; deck.vp -= 2; }
      } else {
         deck.u_mop += 2;
         if (deck.u_mop > 5) deck.u_mop = 5;
         v = fp.roll_die() - sx;
         if (v >= 4) { mobj.u_inf += mobj.s_inf; mobj.s_inf = 0; deck.vp += 2; }
      }
      break; }
   case 207: { // 奥特加当选尼加拉瓜总统 * ok
      const mobj = deck.map.item[7];
      mobj.u_inf = 0;
      effect.opval = fp.opval(card);
      effect.side = 's';
      effect.action = ['c'];
      effect.area = deck.map.edge[7].map(x => `+${x}`);
      const sp = deck.s_player;
      sp.card_effect_op_actions(card, effect);
      break; }
   case 208: { // 北海石油 * ok
      deck.game_buf['208'] = {};
      deck.turn_buf['208'] = {};
      break; }
   case 209: { // 改革家 * ok
      const sp = deck.s_player;
      if (deck.vp < 0) {
         sp.card_inf(6, 2, Object.keys(deck.map.e));
      } else {
         sp.card_inf(4, 2, Object.keys(deck.map.e));
      }
      deck.game_buf['209'] = {};
      break; }
   case 210: { // 推倒柏林墙 * ok
      const mobj = deck.map.item[37]; // East Germany
      mobj.u_inf += 3;
      effect.opval = fp.opval(card);
      effect.side = 'u';
      effect.action = ['c', 'r'];
      effect.area = ['e'];
      const up = deck.u_player;
      up.card_effect_op_actions(card, effect);
      break; }
   case 211: { // 伊朗门丑闻 * ok
      deck.turn_buf['211'] = {};
      break; }
   case 212: { // 恐怖主义 ok
      effect.discard = [];
      if (side === 's') {
         const c1i = i_deck.random(deck.u_cards.length);
         const c1 = deck.u_cards[c1i];
         if (c1) {
            deck.u_cards.splice(c1i, 1);
            effect.discard.push(c1);
         }
         // 217 伊朗人质危机
         const cid217 = deck.game_buf['217'];
         if (cid217 && cid217.target === 'u') {
            const c2i = i_deck.random(deck.u_cards.length);
            const c2 = deck.u_cards[c1i];
            if (c2) {
               deck.u_cards.splice(c2i, 1);
               effect.discard.push(c2);
            }
         }
      } else {
         const c1i = i_deck.random(deck.s_cards.length);
         const c1 = deck.s_cards[c1i];
         if (c1) {
            deck.s_cards.splice(c1i, 1);
            effect.discard.push(c1);
         }
      }
      break; }
   case 213: { // 切尔诺贝利 * ok
      const up = deck.u_player;
      const area_code = up.cid213_area_choose();
      deck.turn_buf['213'] = { area: area_code };
      break; }
   case 214: { // 轰炸海军陆战队军营 * ok
      const mobj = deck.map.item[44]; // Libanon
      mobj.u_inf = 0;
      const sp = deck.s_player;
      sp.card_enemy_inf(2, 2, Object.keys(deck.map.me));
      break; }
   case 215: { // 苏联击落韩国航空公司007航班 * ok
      i_deck.deck_defcon_dec(deck, 1);
      deck.vp += 2;
      if (i_deck.deck_check_control(deck, 85) < 0) { // South Korea
         const up = deck.u_player;
         effect.opval = up.opval(card);
         effect.side = 'u';
         effect.action = ['i', 'r'];
         up.card_effect_op_actions(card, effect);
      }
      break; }
   case 216: { // “邪恶帝国” * ok
      delete deck.game_buf['131'];
      deck.game_buf['216'] = {};
      deck.vp ++;
      break; }
   case 217: { // 伊朗人质危机 * ok
      const mobj = deck.map.item[48];
      mobj.s_inf += 2;
      mobj.u_inf = 0;
      break; }
   case 218: { // 团结工会 * ok
      // 143 约翰·保罗二世当选教皇
      const cid143 = deck.game_buf['143'];
      if (!cid143) { applied = false; break; }
      deck.map.item[38].u_inf += 3; // Poland
      break; }
   case 219: { // 星球大战 * ok
      if (deck.u_space <= deck.s_space) { applied = false; break; }
      const c0 = fp.cid219_choose_discard(deck.discard_pile.filter(x => x.type !== '0n'));
      if (c0) {
         deck.discard_pile.splice(deck.discard_pile.indexOf(c0), 1);
         const c0effect = {};
         act_event(deck, fp, ep, c0, c0effect);
      } else {
         applied = false; break;
      }
      break; }
   case 220: { // 部署潘兴II型导弹 * ok
      deck.vp --;
      const sp = deck.s_player;
      sp.card_enemy_inf(3, 1, Object.keys(deck.map.we));
      break; }
   case 221: { // 尤里和萨曼莎 * ok
      deck.turn_buf['221'] = {};
      break; }
   case 222: { // 拉丁美洲债务危机
      const sp = deck.s_player;
      const up = deck.u_player;
      const c0 = up.cid222_discard();
      if (c0) {
         deck.u_cards.splice(deck.u_cards.indexOf(c0), 1);
         break;
      }
      const list = sp.cid222_double();
      if (!list) { applied = false; break; }
      list.forEach(mid => {
         deck.map.item[mid].s_inf *= 2;
      });
      break; }
   case 223: { // 里根轰炸利比亚 * ok
      deck.vp += ~~(deck.map.item[50].s_inf / 2);
      break; }
   }

   if (applied) {
      switch (piletodo) {
      case 1: deck.remove_pile.push(card); break;
      case 2: deck.pin_pile.push(card); break;
      case -1: break;
      case 0:
      default: deck.discard_pile.push(card);
      }
if (piletodo === 1) console.log('remove_pile:', deck.remove_pile.length);
   } else {
      deck.discard_pile.push(card);
   }
   return applied;
}

function play_test_game() {
   const deck = i_deck.deck_new();
   const s_player = new RandomBot(deck, 's');
   const u_player = new RandomBot(deck, 'u');
   deck.s_player = s_player;
   deck.u_player = u_player;
   s_player.init_map();
   u_player.init_map();
   let turn;
   for (turn = 0; turn < 10; turn++) {
console.log(`\n\n[ Turn ${turn+1} ]\n`);
      i_deck.deck_turn_tick(deck);

      // headline phase
      let s_headline, u_headline;
      // spacerace-4
      if (deck.game_buf.sr4) {
         if (deck.game_buf.sr4.target === 's') {
            u_headline = u_player.pick_headline();
            s_headline = s_player.pick_headline(u_headline);
         } else {
            s_headline = s_player.pick_headline();
            u_headline = u_player.pick_headline(s_headline);
         }
      } else {
         s_headline = s_player.pick_headline();
         u_headline = u_player.pick_headline();
      }
      if (u_headline.id === 5) {
         // 5 背叛者
         deck.discard_pile.push(s_headline);
         deck.discard_pile.push(u_headline);
      } else {
         const headline_s_env = { headline: true };
         const headline_u_env = { headline: true };
         if (s_player.opval(s_headline) > u_player.opval(u_headline)) {
console.log('headline:', 's=', s_headline.id, s_headline.type, s_headline.name, 'u=', u_headline.id, u_headline.type, u_headline.name);
            act_event(deck, s_player, u_player, s_headline, headline_s_env);
            if (check_game_over(deck, 's')) break;
            act_event(deck, u_player, s_player, u_headline, headline_u_env);
            if (check_game_over(deck, 'u')) break;
         } else {
console.log('headline:', 'u=', u_headline.id, u_headline.type, u_headline.name, 's=', s_headline.id, s_headline.type, s_headline.name);
            act_event(deck, u_player, s_player, u_headline, headline_u_env);
            if (check_game_over(deck, 'u')) break;
            act_event(deck, s_player, u_player, s_headline, headline_s_env);
            if (check_game_over(deck, 's')) break;
         }
      }

      // action phase
      const round_n = deck.round;
      while (deck.round--) {
console.log(`\n>> [ Round ${round_n-deck.round} ]`);

         tick_player_round(deck, s_player, u_player);
         if (check_game_over(deck, 's')) break;

         tick_player_round(deck, u_player, s_player);
         if (check_game_over(deck, 'u')) break;
      }
      if (deck.gameover) break;

      // spacerace-8
      if (deck.game_buf.sr8 && deck.game_buf.sr6.target === 's') {
         if (deck.s_player.choose_round8()) {
            tick_player_round(deck, s_player, u_player);
            if (check_game_over(deck, 's')) break;
         }
      }
      // 208 北海石油
      // spacerace-8
      if (deck.game_buf.sr8 || deck.turn_buf['208']) {
         if (deck.u_player.choose_round8()) {
            tick_player_round(deck, u_player, s_player);
            if (check_game_over(deck, 'u')) break;
         }
      }
      // spacerace-6
      if (deck.game_buf.sr6) {
         if (deck.game_buf.sr6.target === 's') {
            if (deck.s_player.choose_discard_held()) {
               deck.s_cards.forEach(x => deck.discard_pile.push(x));
               deck.s_cards = [];
            }
         } else {
            if (deck.u_player.choose_discard_held()) {
               deck.u_cards.forEach(x => deck.discard_pile.push(x));
               deck.u_cards = [];
            }
         }
      }

      // 36 北美防空司令部
      if (deck.game_buf['36'] && deck.defcon === 2) {
         deck.u_player.card_inf(1, 1, Object.keys(deck.map.item).filter(x => deck.map.item[x].u_inf > 0));
      }
   } // action round "for"
   if (!deck.gameover && turn >= 10) {
      deck.turn ++;

      ['e', 'a', 'me', 'ca', 'sa', 'af'].forEach(
         area_code => i_deck.deck_score_area(deck, area_code)
      );

      if (deck.cncard === 1 || deck.cncard === 2) deck.vp --;
      else if (deck.cncard === 3 || deck.cncard === 4) deck.vp ++;

      if (deck.vp < 0) deck.winner = 's';
      else if (deck.vp > 0) deck.winner = 'u';
      else deck.winner = '- (in a draw)';

      deck.gameover = true;
   }
   if (deck.gameover) console.log('winner:', deck.winner);
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
      while (opval && options.length) {
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
      // 213 切尔诺贝利
      const cid213 = this.deck.turn_buf['213'];
      if (cid213 && cid213.area === 'a') return false;
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
   check_game_over,
   tick_player_round,
   play_one_card,
   act_event,
   play_test_game,
};
