(function(global){
  'use strict';
  const D=global.SquadData;
  const copy=x=>JSON.parse(JSON.stringify(x));
  function wage(p){if(p.retired)return 0;return D.wageBands.find(b=>p.ability<=b.max)?.wage??D.wageBands[D.wageBands.length-1].wage;}
  function roster(s,id='you'){return s.players.filter(p=>p.owner===id&&!p.retired);}
  function totals(s){return {gold:Object.values(s.accounts).reduce((sum,account)=>sum+account.gold,0),diamonds:Object.values(s.accounts).reduce((sum,account)=>sum+account.diamonds,0),players:s.players.filter(p=>!p.retired).length};}
  function wageTotal(s,id='you'){return roster(s,id).reduce((v,p)=>v+wage(p),0);}
  function newMarketAuction(){return {round:0,closed:false,currentBid:D.marketAuction.openingBid,leading:null,bids:[]};}
  function settledMarketAuction(){const bids=[];for(const amount of D.marketAuction.playerBids){bids.push({bidder:'you',amount});if(amount<D.rules.tradePrice)bids.push({bidder:'challenger',amount:amount+D.marketAuction.bidIncrement});}return {round:D.marketAuction.playerBids.length,closed:true,currentBid:D.rules.tradePrice,leading:'you',bids};}
  function marketAuction(s){return copy(s.marketAuction||(s.completed.includes('trade')?settledMarketAuction():newMarketAuction()));}
  function officialAuction(s){
    if(s.officialAuction)return copy(s.officialAuction);
    const bids=[];if(s.completed.includes('auction'))for(const amount of D.officialAuction.buyerBids){bids.push({bidder:'you',amount});if(amount<D.rules.auctionPrice)bids.push({bidder:'challenger',amount:amount+D.officialAuction.bidIncrement});}
    return {round:s.completed.includes('auction')?D.officialAuction.buyerBids.length:0,closed:s.completed.includes('auction'),currentBid:s.completed.includes('auction')?D.rules.auctionPrice:D.officialAuction.openingBid,leading:s.completed.includes('auction')?'you':null,bids};
  }
  function bidOfficial(s){
    if(s.completed.includes('auction'))return {settled:true};
    const draft=copy(s),auction=officialAuction(draft),offer=D.officialAuction.buyerBids[auction.round];
    if(!Number.isInteger(offer))throw new Error('官府竞价轮次无效。');
    if(draft.accounts.you.gold<offer)throw new Error('铜钱余额不足，无法提交本轮报价。');
    auction.bids.push({bidder:'you',amount:offer});auction.round+=1;auction.currentBid=offer;auction.leading='you';draft.officialAuction=auction;
    let challengerBid=null;
    if(offer<D.rules.auctionPrice){challengerBid=offer+D.officialAuction.bidIncrement;auction.bids.push({bidder:'challenger',amount:challengerBid});auction.currentBid=challengerBid;auction.leading='challenger';}
    else{auction.closed=true;act(draft,'auction');}
    if(!validate(draft))throw new Error('官府竞拍账本核对失败。');
    Object.assign(s,draft);return {settled:s.completed.includes('auction'),offer,challengerBid};
  }
  function bidMarket(s){
    if(s.completed.includes('trade'))return {settled:true};
    const draft=copy(s),auction=marketAuction(draft),offer=D.marketAuction.playerBids[auction.round];
    if(!Number.isInteger(offer))throw new Error('竞价轮次无效。');
    if(draft.accounts.you.gold<offer)throw new Error('铜钱余额不足，无法提交本轮报价。');
    auction.bids.push({bidder:'you',amount:offer});auction.round+=1;auction.currentBid=offer;auction.leading='you';draft.marketAuction=auction;
    let challengerBid=null;
    if(offer<D.rules.tradePrice){challengerBid=offer+D.marketAuction.bidIncrement;auction.bids.push({bidder:'challenger',amount:challengerBid});auction.currentBid=challengerBid;auction.leading='challenger';}
    else act(draft,'trade');
    if(!validate(draft))throw new Error('竞拍账本核对失败。');
    Object.assign(s,draft);return {settled:s.completed.includes('trade'),offer,challengerBid};
  }
  function initial(){return {version:D.version,flowRevision:D.flowRevision,currencyRevision:D.currencyRevision,economyRevision:D.economyRevision,exchangeRevision:D.exchangeRevision,rosterRevision:D.rosterRevision,season:4,day:14,seasonRecord:{season:4,wins:9,losses:4,rank:3,totalTeams:8},lastSeasonRecord:null,accounts:{you:{gold:1000,diamonds:D.rules.initialDiamonds},rival:{gold:0,diamonds:0},market:{gold:D.rules.marketGold,diamonds:0}},players:copy(D.members),lineup:copy(D.initialLineup),ledger:[],completed:[],checkpoint:'welcome',read:[],selected:D.initialLineup[0],history:[]};}
  function migrateSave(saved){
    if(!validate(saved))return null;
    const draft=copy(saved),oldCurrency=draft.currencyRevision!==D.currencyRevision;
    const outdated=['flowRevision','currencyRevision','economyRevision','exchangeRevision','rosterRevision'].some(key=>draft[key]!==D[key])||draft.completed.some(id=>['pvp','age','box','recharge'].includes(id));
    if(!outdated)return draft;
    const replay=initial();
    for(const action of ['settle','trade','exchange','auction','exchange-back','train','scout']){
      if(!draft.completed.includes(action))continue;
      // The new buyback must be shown before any jade is spent in an older save.
      if(oldCurrency&&['exchange-back','train','scout'].includes(action))continue;
      act(replay,action);
    }
    if(!draft.completed.includes('trade'))replay.marketAuction=marketAuction(draft);
    if(!draft.completed.includes('auction')&&draft.officialAuction){replay.officialAuction=officialAuction(draft);for(const bid of replay.officialAuction.bids)if(bid.bidder==='rival')bid.bidder='you';if(replay.officialAuction.leading==='rival')replay.officialAuction.leading='you';}
    replay.checkpoint=draft.checkpoint;replay.read=copy(draft.read||[]);replay.history=copy(draft.history||[]);
    if(replay.players.some(member=>member.id===draft.selected))replay.selected=draft.selected;
    if(oldCurrency&&draft.completed.includes('auction'))replay.checkpoint='go-exchange-back';
    else if(oldCurrency&&draft.completed.some(id=>['train','scout'].includes(id)))replay.checkpoint='go-auction';
    return validate(replay)?replay:null;
  }
  function effect(s,id,label,deltas,update){
    if(s.completed.includes(id))return false;
    const draft=copy(s),before=totals(draft);
    for(const [account,delta] of Object.entries(deltas)){
      if(!draft.accounts[account])throw new Error('不存在的示例账户');
      for(const currency of ['gold','diamonds']){
        const change=delta[currency]||0;
        if(!Number.isInteger(change))throw new Error('货币结算必须使用整数');
        draft.accounts[account][currency]+=change;
        if(draft.accounts[account][currency]<0)throw new Error('余额不足，请重播本章的预设流程。');
      }
    }
    if(update)update(draft);
    const after=totals(draft);
    draft.completed.push(id);draft.ledger.push({id,label,deltas:copy(deltas),gold:after.gold-before.gold,diamonds:after.diamonds-before.diamonds,players:after.players-before.players,totals:after});
    Object.assign(s,draft);return true;
  }
  function act(s,action){
    const R=D.rules;
    if(action==='settle')return effect(s,'settle','联赛奖励与军饷结算',{you:{gold:R.winReward-wageTotal(s)}},draft=>{draft.lastReward=R.winReward;draft.lastSalary=wageTotal(s);draft.seasonRecord.wins+=1;draft.seasonRecord.rank=2;});
    if(action==='trade'){
      const tax=Math.round(R.tradePrice*R.tradeTax);
      const member=s.players.find(p=>p.id==='xu');if(!s.completed.includes('trade')&&member?.owner!=='rival')throw new Error('挂单所有权无效');
      return effect(s,'trade','竞拍许衡；卖方缴纳20%交易税',{you:{gold:-R.tradePrice},rival:{gold:R.tradePrice-tax}},draft=>{draft.players.find(p=>p.id==='xu').owner='you';draft.marketAuction=settledMarketAuction();});
    }
    if(action==='exchange'||action==='exchange-back'){
      const quote=action==='exchange'?D.exchangeQuotes.sell:D.exchangeQuotes.buy,principal=quote.quantity*quote.rate,direction=action==='exchange'?1:-1;
      return effect(s,action,action==='exchange'?'卖出100玉璧，换得2,000铜钱':'支付1,000铜钱，买回40玉璧',{you:{gold:direction*principal,diamonds:-direction*quote.quantity},market:{gold:-direction*principal,diamonds:direction*quote.quantity}});
    }
    if(action==='train')return effect(s,'train','使用练兵服务',{you:{diamonds:-R.trainingCost}},draft=>{draft.players.find(p=>p.id==='lin').training+=1;});
    if(action==='scout')return effect(s,'scout','寻访搜索；新增后备武将',{you:{diamonds:-R.scoutingCost}},draft=>draft.players.push(copy(D.additions.rookie)));
    if(action==='age')return effect(s,'age','全服赛季年龄结算；周远退役',{},draft=>{
      draft.lastSeasonRecord=copy(draft.seasonRecord);draft.season+=1;draft.day=1;draft.seasonRecord={season:draft.season,wins:0,losses:0,rank:null,totalTeams:8};
      for(const p of draft.players){
        if(p.retired)continue;
        p.age+=R.agePerSeason;
        if(p.age>=R.retirementAge){p.retired=true;continue;}
        const trainingBonus=Math.max(0,(p.training||0)-(p.appliedTraining||0));
        if(p.age<22)p.ability=Math.min(p.potential,p.ability+Math.min(5,Math.max(1,Math.round((p.potential-p.ability)*.18)))+trainingBonus);
        else if(p.age<30)p.ability=Math.min(p.potential,p.ability+1+trainingBonus);
        else p.ability=Math.max(35,p.ability-2+Math.min(1,trainingBonus));
        p.appliedTraining=p.training||0;
      }
      draft.lineup=draft.lineup.filter(id=>draft.players.some(p=>p.id===id&&!p.retired));
      const replacement=roster(draft).find(p=>!draft.lineup.includes(p.id));if(replacement&&draft.lineup.length<3)draft.lineup.push(replacement.id);
    });
    if(action==='box')return effect(s,'box','领取普通武将奖励',{},draft=>draft.players.push(copy(D.additions.box)));
    if(action==='auction')return effect(s,'auction','你竞得唐晟；官府回收成交款',{you:{gold:-R.auctionPrice}},draft=>draft.players.push(copy(D.additions.rare)));
    throw new Error('未知的流程操作');
  }
  function validate(s){
    if(!s||s.version!==D.version||!s.seasonRecord||!s.accounts||!Array.isArray(s.players)||!Array.isArray(s.completed)||!Array.isArray(s.ledger))return false;
    if(new Set(s.completed).size!==s.completed.length||new Set(s.players.map(p=>p.id)).size!==s.players.length)return false;
    for(const account of Object.values(s.accounts))for(const v of [account.gold,account.diamonds])if(!Number.isInteger(v)||v<0)return false;
    const t=totals(s),initialDiamonds=s.currencyRevision===D.currencyRevision||s.exchangeRevision===D.exchangeRevision?D.rules.initialDiamonds:0;return t.gold===3000+s.ledger.reduce((n,e)=>n+e.gold,0)&&t.diamonds===initialDiamonds+s.ledger.reduce((n,e)=>n+e.diamonds,0)&&t.players===D.members.length+s.ledger.reduce((n,e)=>n+e.players,0);
  }
  global.SquadEngine={initial,act,roster,wage,wageTotal,totals,validate,migrateSave,marketAuction,bidMarket,officialAuction,bidOfficial,copy};
})(typeof window!=='undefined'?window:globalThis);
