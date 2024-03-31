const i_act = require('./action');
const i_deepclone = require('./deepclone');

const seasons = [4, 3, 2, 2, 2];

function deck_new() {
   const deck = {};
   deck.players = [];
   deck.actions = i_act.BasicActionCard.map(x => i_deepclone(x));
   deck.major_cards = i_act.MajorImprovementCard.map(x => i_deepclone(x));

   // init rounds
   deck.round = 0;
   deck.rounds = i_act.RoundActionCard.map(x => i_deepclone(x));
   let base = 0;
   for (let i = 0; i < seasons.length; i++) {
      const n = seasons[i];
      for (let j = 0; j < n; j++) {
         const i1 = ~~(Math.random() * n);
         const i2 = ~~(Math.random() * n);
         if (i1 == i2) continue;
         const x = deck.rounds[i1];
         deck.rounds[base+i1] = deck.rounds[base+i2];
         deck.rounds[base+i2] = x;
      }
      base += n;
   }

   return deck;
}

// add expanded action
function deck_add_action(deck, action) {
   deck.actions.push(action);
}

// add player
function deck_add_player(deck, player) {
   deck.players.push(player);
}

function _fill_acc_action(action) {
   if (!action.acc) return;
   if (!action.n) action.n = 0;
   action.n += action.acc;
}
function _cleanup_action(action) {
   if (action.picked != -1) action.picked = -1;
}
function _traverse_action(action) {
   if (action.action) {
      _traverse_action(action.action);
      return;
   }
   if (action.after) {
      _traverse_action(action.after);
   }
   if (action.one) {
      _fill_acc_action(action);
      _cleanup_action(action);
      return;
   }
   let action_list = null;
   if (action.any) action_list = action.any;
   else if (action.or) action_list = action.or;
   else if (action.and) action_list = action.and;
   if (action_list) {
      action_list.forEach(x => _traverse_action(x));
   }
}

function deck_tick_round(deck) {
   // TODO: check season
   deck.round ++;
   if (deck.round >= 14) return; // game over
   // fill acc actions
   deck_add_action(deck, deck.rounds.shift());
   deck.actions.forEach(x => _traverse_action(x));
}

function deck_score(deck) {
   // TODO: score current players
}

module.exports = {
   deck_new,
   deck_add_action,
   deck_add_player,
   deck_tick_round,
   deck_score,
};
