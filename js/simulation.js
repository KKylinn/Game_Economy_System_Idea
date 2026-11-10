/* 烽策：40人封闭经济模拟。金额内部为0.1铜钱整数；预测不写入实际状态。 */
(function FengceSimulationModule(root) {
  'use strict';
  const VERSION = '120-day-economy-6';
  const initialJadePerPlayer = 10;
  const defaultSeed = '朔风-mw52enbe';
  const defaults = Object.freeze({win:200,loss:160,official6:2,official12:2,wage:1,taxPre:5,taxMatch:20,taxPost:5,train:15,recruit:10,age:30,health:40});
  const fields = [
    ['win','胜场奖励',0,1000,10,'铜钱'],['loss','败场奖励',0,1000,10,'铜钱'],
    ['official6','每季第6天投放',0,40,2,'名'],['official12','每季第12天投放',0,40,2,'名'],
    ['wage','军饷倍率',0,3,.1,'倍'],['taxPre','赛前交易税',0,50,1,'%'],
    ['taxMatch','比赛期交易税',0,50,1,'%'],['taxPost','赛后交易税',0,50,1,'%'],
    ['train','单次练兵费用',0,100,1,'玉璧'],['recruit','单次寻访费用',0,100,1,'玉璧'],
    ['age','年龄退出起点A',20,40,1,'岁'],['health','健康退出阈值H',20,60,1,'点']
  ];
  const preferences = {battle:{name:'偏重战绩',w:[.6,.2,.2],reserve:3},steady:{name:'稳健经营',w:[.4,.3,.3],reserve:5},asset:{name:'偏重长期资产',w:[.2,.3,.5],reserve:4}};
  const groups = {free:'不充值',light:'轻度充值',heavy:'重度充值'};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), sum=a=>a.reduce((s,v)=>s+v,0), mean=a=>a.length?sum(a)/a.length:0;
  const money=n=>Math.round(n*10), shown=n=>n/10;
  function random(seed,...parts){let h=2166136261;for(const c of [seed,...parts].join('|')){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);return ((h^(h>>>16))>>>0)/4294967296;}
  const integer=(seed,min,max,...parts)=>min+Math.floor(random(seed,...parts)*(max-min+1));
  const shuffled=(a,seed,...key)=>a.map((v,i)=>({v,r:random(seed,...key,typeof v==='object'?(v.id??v.g?.id??i):i,typeof v==='object'?'':v)})).sort((a,b)=>a.r-b.r).map(x=>x.v);
  function weighted(seed,values,weight,...key){const weights=values.map(weight),total=sum(weights);let x=random(seed,...key)*total;for(let i=0;i<values.length;i++){x-=weights[i];if(x<0)return values[i];}return values.at(-1);}
  const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
  function validatePolicy(input={}){const p={...defaults,...input};for(const [key,label,min,max,step] of fields){const v=p[key];if(!Number.isFinite(v)||v<min||v>max||Math.abs((v-min)/step-Math.round((v-min)/step))>1e-7)throw Error(label+'不符合范围或步长');}if(p.win<p.loss)throw Error('获胜奖励不能低于失败奖励');return Object.freeze(p);}
  const dayInfo=d=>({season:Math.floor((d-1)/12),local:(d-1)%12+1,match:(d-1)%12>=1&&(d-1)%12<=10,round:(d-1)%12-1});
  const wageBase=g=>g.score<=60?20:g.score<70?25:g.score<80?30:g.score<90?40:50;
  const wage=(g,p)=>money(wageBase(g)*p.wage);
  const roster=(s,p)=>s.generals.filter(g=>g.owner===p.id&&!g.retired);
  const wageTotal=(s,p)=>sum(roster(s,p).map(g=>wage(g,s.policy)));
  const reserve=(s,p)=>wageTotal(s,p)*preferences[p.preference].reserve;
  const injured=(g,d)=>g.injuryUntil>0&&g.injuryUntil>=d;
  const taxRate=(s,d)=>{const n=dayInfo(d).local;return (n===1?s.policy.taxPre:n===12?s.policy.taxPost:s.policy.taxMatch)/100;};
  const listingProbability=t=>Math.max(0,.8*(1-2.5*t));
  const effective=(g,d)=>g.score*(injured(g,d)?.7:1);
  const probability=(a,b)=>clamp(.5+.03*(a-b),.01,.99);
  function generate(seed,id,owner,source,day=0,type=null){
    let score,age,potential,health;
    if(source==='initial'){
      score=integer(seed,60,80,id,'score');age=integer(seed,18,40,id,'age');
      potential=weighted(seed,range(Math.max(75,score),90),v=>91-v,id,'potential');
      const t=(age-18)/22;health=weighted(seed,range(60,100),v=>(1-t)*(v-59)+t*(101-v),id,'health');
    }else if(source==='recruit'){
      score=integer(seed,60,70,id,'score');age=integer(seed,18,22,id,'age');potential=weighted(seed,range(75,90),v=>91-v,id,'potential');health=integer(seed,90,100,id,'health');
    }else if(type==='ready'){
      score=integer(seed,80,90,id,'score');age=integer(seed,25,29,id,'age');potential=integer(seed,Math.max(85,score),90,id,'potential');health=integer(seed,80,100,id,'health');
    }else{
      score=integer(seed,70,80,id,'score');age=integer(seed,18,22,id,'age');potential=integer(seed,90,100,id,'potential');health=integer(seed,90,100,id,'health');
    }
    const family=['林','顾','周','何','严','许','唐','陆','沈','秦','韩','魏'],names=['川','远','越','澈','衡','星','晟','峥','霁','临','羽','昭'];
    return {id,owner,source,type,name:family[integer(seed,0,11,id,'surname')]+names[integer(seed,0,11,id,'name')],score,age,potential,health,injuryUntil:0,appearances:0,created:day,retired:false,trainedDay:0};
  }
  function schedule(seed,season){const ids=shuffled(range(0,39),seed,'schedule',season),rounds=[];let ring=ids.slice();for(let r=0;r<39;r++){rounds.push(range(0,19).map(i=>[ring[i],ring[39-i]]));ring=[ring[0],ring.at(-1),...ring.slice(1,-1)];}return shuffled(rounds,seed,'rounds',season).slice(0,10);}
  function create(input={},seed=defaultSeed){
    const policy=validatePolicy(input),ids=range(0,39),pay=shuffled(ids,seed,'pay'),types=shuffled(ids,seed,'preferences');
    const amounts=[];for(let i=0;i<20;i++){const offset=integer(seed,-5,5,'wallet',i)*100;amounts.push(2000+offset,2000-offset);}const wallets=shuffled(amounts,seed,'wallet-order');
    const players=ids.map(i=>({id:i,name:'领主'+String(i+1).padStart(2,'0'),group:pay.indexOf(i)<2?'heavy':pay.indexOf(i)<6?'light':'free',preference:types.indexOf(i)<10?'battle':types.indexOf(i)<30?'steady':'asset',coins:money(wallets[i]),jade:initialJadePerPlayer,debt:0,wins:0,losses:0,lastLineup:[],previousOrder:null}));
    const s={version:VERSION,seed:String(seed),policy,day:0,players,generals:players.flatMap(p=>range(0,4).map(i=>generate(seed,'p'+p.id+'-g'+i,p.id,'initial'))),schedules:range(0,9).map(n=>schedule(seed,n)),ledger:[],days:[],markets:[],fx:[],orders:[],lastRate:null,stats:{reward:0,wages:0,tax:0,official:0,recharge:0,training:0,recruitment:0,bornOfficial:0,bornRecruit:0,exitHealth:0,exitAge:0,normal:0,singleForfeit:0,doubleForfeit:0,officialPlanned:0,officialUnsold:0},complete:false};
    for(const p of players)p.lastLineup=roster(s,p).slice().sort((a,b)=>b.score-a.score).slice(0,3).map(g=>g.id);
    s.days.push(snapshot(s));return s;
  }
  function emit(s,type,deltas={},extra={}){const coins=sum(Object.values(deltas).map(d=>d.coins||0)),jade=sum(Object.values(deltas).map(d=>d.jade||0)),assets=sum(Object.values(deltas).map(d=>d.assets||0));const event={day:s.day,type,coins,jade,assets,deltas,...extra};s.ledger.push(event);return event;}
  function clearDebt(s,p,limit=Infinity){const paid=Math.min(p.coins-(p.recoveryFund||0),p.debt,limit);if(paid<=0)return 0;p.coins-=paid;p.debt-=paid;s.stats.wages+=paid;emit(s,'debt',{[p.id]:{coins:-paid,debt:-paid}},{amount:paid});return paid;}
  function reward(s,p,amount,recovery=false){const n=money(amount);p.coins+=n;s.stats.reward+=n;emit(s,'reward',{[p.id]:{coins:n}},{amount:n,recovery});if(!recovery)clearDebt(s,p);return n;}
  function payWage(s,p,due){const paid=Math.min(p.coins-(p.recoveryFund||0),due),debt=due-paid;p.coins-=paid;p.debt+=debt;s.stats.wages+=paid;emit(s,'wage',{[p.id]:{coins:-paid,debt}},{due,paid,unpaid:debt});return paid;}
  function cancelSalePlans(p,id){if(p?.salePlans)p.salePlans=p.salePlans.filter(x=>x.outgoing!==id&&x.incoming!==id);}
  function planSale(p,outgoing,incoming){p.salePlans=p.salePlans||[];if(!p.salePlans.some(x=>x.outgoing===outgoing))p.salePlans.push({outgoing,incoming});}
  function retire(s,g,reason){if(g.retired)return;g.retired=true;cancelSalePlans(s.players[g.owner],g.id);s.stats[reason==='health'?'exitHealth':'exitAge']++;emit(s,'retire',{[g.owner]:{assets:-1}},{general:g.id,reason,name:g.name});}
  function seasonEnd(s){for(const g of s.generals.filter(g=>g.owner!==null&&!g.retired)){
    if(g.age>=s.policy.age&&g.appearances<g.age-s.policy.age+1){retire(s,g,'age');continue;}
    g.score=clamp(g.score+(g.age<=24?2:g.age<=29?1:-1),1,g.potential);g.age++;
  }}
  function snapshot(s){return {day:s.day,coins:sum(s.players.map(p=>p.coins)),jade:sum(s.players.map(p=>p.jade)),assets:s.generals.filter(g=>g.owner!==null&&!g.retired).length,debt:sum(s.players.map(p=>p.debt)),stats:{...s.stats},players:s.players.map(p=>({id:p.id,group:p.group,preference:p.preference,coins:p.coins,jade:p.jade,debt:p.debt,wins:p.wins,losses:p.losses,lineup:p.lastLineup.slice(),salePlans:(p.salePlans||[]).map(plan=>({...plan})),recoveryFund:p.recoveryFund||0,recoveryActive:!!p.recoveryActive,consumption:p.consumption?JSON.parse(JSON.stringify(p.consumption)):null,decision:p.decision?{...p.decision,parts:p.decision.parts.slice(),wins:p.decision.wins.slice()}:null,generals:roster(s,p).map(g=>({...g}))}))};}
  function audit(s){const t=snapshot(s),q=s.stats,initialJade=s.days[0].jade,errors=[];
    if(t.coins!==800000+q.reward-q.wages-q.tax-q.official)errors.push('铜钱存量不守恒');
    if(t.jade!==initialJade+q.recharge-q.training-q.recruitment)errors.push('玉璧存量不守恒');
    if(t.assets!==200+q.bornOfficial+q.bornRecruit-q.exitHealth-q.exitAge)errors.push('武将存量不守恒');
    for(const p of s.players)if(!Number.isInteger(p.coins)||!Number.isInteger(p.jade)||!Number.isInteger(p.debt)||Math.min(p.coins,p.jade,p.debt)<0)errors.push('玩家余额异常 '+p.id);
    for(const p of s.players)if((p.recoveryFund||0)<0||(p.recoveryFund||0)>p.coins)errors.push('补员储备超出钱包 '+p.id);
    if(new Set(s.generals.map(g=>g.id)).size!==s.generals.length)errors.push('资产身份重复');
    const debts=sum(s.ledger.flatMap(e=>Object.values(e.deltas)).map(d=>d.debt||0));if(debts!==t.debt)errors.push('欠饷分录不一致');
    if(sum(s.ledger.map(e=>e.coins))!==t.coins-800000||sum(s.ledger.map(e=>e.jade))!==t.jade-initialJade||sum(s.ledger.map(e=>e.assets))!==t.assets-200)errors.push('逐笔分录与期末不一致');
    return {ok:!errors.length,errors};
  }

  /* 有限候选滚动计划：只读公开状态，未知伤病用期望近似，不使用实际未来随机数。 */
  const evaluationCache=new WeakMap();
  function projectedInjury(g,d){return injured(g,d)?1:clamp(g.risk?.[0]||0,0,1);}
  function publicTeam(s,p,d){const members=roster(s,p),last=p.lastLineup.map(id=>members.find(g=>g.id===id)).filter(Boolean),chosen=last.length===3?last:members.slice().sort((a,b)=>effective(b,d)-effective(a,d)).slice(0,3);return {score:(sum(chosen.map(g=>effective(g,d)))+(3-chosen.length)*55)/3,eligible:chosen.filter(g=>!injured(g,d)).length,count:3};}
  function context(s,p){const n=dayInfo(s.day),teams=s.players.map(q=>publicTeam(s,q,s.day)),others=teams.filter((_,i)=>i!==p.id);return {currentSeason:n.season,teams,average:mean(others.map(t=>t.score)),eligible:mean(others.map(t=>t.eligible)),publicKey:teams.map(t=>t.score.toFixed(4)+','+t.eligible+','+t.count).join(';')};}
  function opponent(s,p,d,c){const info=dayInfo(d);if(info.season!==c.currentSeason)return {score:c.average,eligible:c.eligible,count:3};const pair=s.schedules[info.season][info.round].find(pair=>pair.includes(p.id));return c.teams[pair[0]===p.id?pair[1]:pair[0]];}
  function priority(g,s,p,d,left){const w=preferences[p.preference].w,inj=projectedInjury(g,d),health=clamp((g.health-2-s.policy.health)/(100-s.policy.health)*100,0,100),needed=Math.max(0,g.age-s.policy.age+1-g.appearances),possible=g.age<s.policy.age||needed<=left;
    const long=(.7*g.score+.3*g.potential)*(possible?1:.05),urgency=g.age>=s.policy.age&&needed>0&&possible?(needed/Math.max(1,left))*long:0;
    return w[0]*g.score*(1-.3*inj)+w[1]*health+w[2]*(long*.55+urgency*.9);
  }
  function combinations(a){const r=[];for(let i=0;i<a.length-2;i++)for(let j=i+1;j<a.length-1;j++)for(let k=j+1;k<a.length;k++)r.push([a[i],a[j],a[k]]);return r;}
  function candidates(s,p,members){if(members.length<3)return [[]];const firstDay=(()=>{let d=s.day;while(!dayInfo(d).match)d++;return d;})(),left=11-dayInfo(firstDay).local+1;
    const sorted=members.slice().sort((a,b)=>priority(b,s,p,firstDay,left)-priority(a,s,p,firstDay,left));
    // 大阵容使用至多12人的候选池；所有资产仍进入军饷、年龄名额和后续退出计算。
    const pool=sorted.slice(0,9);for(const g of members.slice().sort((a,b)=>effective(b,firstDay)-effective(a,firstDay)).slice(0,3))if(!pool.includes(g)&&pool.length<12)pool.push(g);
    const all=combinations(pool);if(all.length<=10)return all.map(a=>a.map(g=>g.id));
    all.sort((a,b)=>sum(b.map(g=>priority(g,s,p,firstDay,left)))-sum(a.map(g=>priority(g,s,p,firstDay,left))));
    const selected=all.slice(0,8);for(const metric of [g=>effective(g,firstDay),g=>g.health,g=>g.potential,g=>g.age>=s.policy.age?Math.max(0,g.age-s.policy.age+1-g.appearances):0])selected.push(pool.slice().sort((a,b)=>metric(b)-metric(a)).slice(0,3));
    return [...new Map(selected.map(a=>[a.map(g=>g.id).sort().join(','),a.map(g=>g.id)])).values()];
  }
  function healthValue(g,H){return !g||g.retired?0:clamp((g.health-H)/(100-H)*100,0,100);}
  function planned(s,p,members,first,c){
    let gs=members.map(g=>({...g,risk:[0,0,0,0,0]}));const startSeason=c.currentSeason,end=(startSeason+4)*12,wins=[],rewards=[],healths=[],seasonScores=[],firstLineup=[];let firstUsed=false,bucket=new Map();
    for(let d=s.day;d<=end;d++){
      const info=dayInfo(d);if(info.local===1&&d!==s.day)for(const g of gs)g.appearances=0;
      const live=gs.filter(g=>!g.retired),line=info.match?(live.length<3?[]:!firstUsed?first.map(id=>live.find(g=>g.id===id)).filter(Boolean):live.slice().sort((a,b)=>priority(b,s,p,d,12-info.local)-priority(a,s,p,d,12-info.local)).slice(0,3)):[];
      if(info.match&&!firstUsed){firstUsed=true;firstLineup.push(...line.map(g=>g.id));}
      const opp=info.match?opponent(s,p,d,c):null,ownIds=new Set(line.length===3&&opp?.count>=3?line.map(g=>g.id):[]);
      if(info.match&&wins.length<3){const chance=line.length<3?0:opp.count<3?1:probability(mean(line.map(g=>g.score*(1-.3*projectedInjury(g,d)))),opp.score);wins.push(chance);rewards.push(line.length<3?0:chance*s.policy.win+(1-chance)*s.policy.loss);}
      if(info.match&&info.season>startSeason){for(const g of live){const old=bucket.get(g.id)||0;bucket.set(g.id,old+(.7*g.score+.3*g.potential)*(1-.3*projectedInjury(g,d))/10);}}
      const eligible=info.match?sum(line.map(g=>1-projectedInjury(g,d)))+(opp?.eligible||0):0;
      for(const g of live){const injury=projectedInjury(g,d),played=ownIds.has(g.id),newChance=played&&line.length===3&&opp?.count>=3&&eligible>0?.05*(1-injury)/eligible:0;
        if(played){g.health-=2+3*newChance;g.appearances++;}else g.health=Math.min(100,g.health+1-injury);
        g.risk=[...g.risk.slice(1),0];for(let k=0;k<5;k++)g.risk[k]=clamp(g.risk[k]+newChance*(5-k)/5,0,1);
        if(g.health<s.policy.health)g.retired=true;
      }
      if(info.match&&healths.length<3){const extra=gs.filter(g=>!g.retired&&!ownIds.has(g.id)).sort((a,b)=>(.7*b.score+.3*b.potential)-(.7*a.score+.3*a.potential)).slice(0,2);healths.push(sum(line.map(g=>healthValue(g,s.policy.health)*.25))+sum(extra.map(g=>healthValue(g,s.policy.health)*.125)));}
      if(info.local===11){
        if(info.season>startSeason){const a=[...bucket.values()].sort((a,b)=>b-a);seasonScores.push(sum(a.slice(0,3))*.25+sum(a.slice(3,5))*.125);bucket=new Map();}
        for(const g of gs.filter(g=>!g.retired)){if(g.age>=s.policy.age&&g.appearances<g.age-s.policy.age+1){g.retired=true;continue;}g.score=clamp(g.score+(g.age<=24?2:g.age<=29?1:-1),1,g.potential);g.age++;}
      }
    }
    const parts=[mean(wins)*100,mean(healths),(seasonScores[0]||0)*.5+(seasonScores[1]||0)*.3+(seasonScores[2]||0)*.2],w=preferences[p.preference].w;
    return {score:sum(parts.map((v,i)=>v*w[i])),parts,lineup:firstLineup,expectedReward:mean(rewards),wins};
  }
  function evaluate(s,p,members=roster(s,p)){
    const c=context(s,p),signature=members.map(g=>[g.id,g.score,g.age,g.potential,g.health,g.injuryUntil,g.appearances].join(':')).join(';'),key=[s.day,p.id,signature,c.publicKey].join('|');let cache=evaluationCache.get(s);if(!cache){cache=new Map();evaluationCache.set(s,cache);}if(cache.has(key))return cache.get(key);
    let best=null;for(const first of candidates(s,p,members)){const a=planned(s,p,members,first,c),tie=random(s.seed,'decision-tie',s.day,p.id,...first);if(!best||a.score>best.score+1e-8||(Math.abs(a.score-best.score)<1e-8&&tie>best.tie))best={...a,tie};}
    // 缺员弃赛不领取败奖：避免军饷压力比较使用虚构奖励。
    if(members.length<3)best.expectedReward=0;
    cache.set(key,best);return best;
  }
  // 军饷成本只用于行为比较，不给武将预设铜钱估值，也不计作已支付。
  const costScore=(s,p,daily)=>2*preferences[p.preference].reserve*daily/money(Math.max(1,(s.policy.win+s.policy.loss)/2));
  function contract(s,g){
    const local=dayInfo(s.day).local,remaining=local===1||local===12?10:12-local;
    const appearances=local===12?0:g.appearances;
    const short=g.age>=s.policy.age&&appearances+remaining<g.age-s.policy.age+1;
    const healthGames=Math.max(1,Math.floor((g.health-s.policy.health)/2)+1);
    const ageGames=remaining+10*Math.max(0,s.policy.age+10-g.age);
    return {short,games:Math.min(short?remaining:Math.min(18,ageGames),healthGames)};
  }
  function willingness(s,before,after,dailyChange,qualityGain,games){
    const income=money(after.expectedReward-before.expectedReward)-dailyChange;
    const competition=money((s.policy.win+s.policy.loss)/2*.35)*clamp(qualityGain/8,0,1);
    return Math.max(0,Math.floor((income+competition)*games));
  }
  function matureStarter(s,g){return g.score>=80&&g.age<30&&g.health>=s.policy.health+20;}
  function starterPremium(s,p,g,mine,opportunity,games){
    if(mine.length<3||!matureStarter(s,g)||!opportunity.after.lineup.includes(g.id))return 0;
    const strength=members=>mean(members.map(x=>effective(x,s.day)).sort((a,b)=>b-a).slice(0,3));
    const gain=strength(opportunity.members)-strength(mine);
    const matchIncome=money((s.policy.win+s.policy.loss)/2);
    const liquidity=clamp((p.coins-reserve(s,p))/Math.max(1,40*matchIncome),0,1);
    return Math.floor(.7*matchIncome*games*liquidity*clamp(gain/4,0,1));
  }
  function usage(s,p,g){const elapsed=clamp(dayInfo(s.day).local-2,1,10);return .5*(p.lastLineup.includes(g.id)?1:0)+.5*clamp(g.appearances/elapsed,0,1);}
  function assetOpportunity(s,p,g){const mine=roster(s,p),before=evaluate(s,p,mine),added={...g,owner:p.id},holdDaily=wageTotal(s,p)+wage(g,s.policy);
    const options=[{members:[...mine,added],replace:null,operatingDaily:holdDaily}];
    // 有限搜索：选择当前使用价值最低的一名非待售武将，再详算换将方案。
    if(mine.length>=3){const old=mine.filter(x=>!(p.salePlans||[]).some(plan=>plan.outgoing===x.id)).sort((a,b)=>priority(a,s,p,s.day,Math.max(1,12-dayInfo(s.day).local))-priority(b,s,p,s.day,Math.max(1,12-dayInfo(s.day).local))||wage(b,s.policy)-wage(a,s.policy))[0];if(old)options.push({members:[...mine.filter(x=>x.id!==old.id),added],replace:old.id,operatingDaily:holdDaily-wage(old,s.policy)});}
    let best=null;for(const option of options){const after=evaluate(s,p,option.members),qualityDelta=after.score-before.score,delta=qualityDelta-costScore(s,p,option.operatingDaily-wageTotal(s,p));const fixes=after.wins.some((v,i)=>v>0&&before.wins[i]===0),urgent=mine.length<3||before.wins.some(v=>v===0)&&fixes;
      let level=urgent?3:delta>=8?3:delta>=3?2:delta>1e-8?1:0;if(!urgent&&option.operatingDaily>money(after.expectedReward))level=Math.max(0,level-1);
      const result={...option,before,after,qualityDelta,delta,urgent,holdDaily,level};if(!best||level>best.level||level===best.level&&delta>best.delta+1e-8)best=result;
    }return best;
  }
  function buyDemand(s,p,g,includeUnfunded=false){const mine=roster(s,p);if(p.debt>0&&mine.length>=3)return null;
    const daily=wageTotal(s,p)+wage(g,s.policy),budget=Math.max(0,p.coins-daily*preferences[p.preference].reserve);if(!includeUnfunded&&budget<500)return null;
    const {short,games}=contract(s,g);
    if(short&&mine.length!==2)return null;
    const opportunity=assetOpportunity(s,p,g);
    const {delta,qualityDelta,urgent,replace,operatingDaily,level,before,after}=opportunity;
    // 短契按首场可兑现收益估值。缺员的中间补员也有有限的预算价值。
    const premium=short?0:starterPremium(s,p,g,mine,opportunity,games);
    let valueCap=short?Math.max(0,money(after.wins[0]*s.policy.win+(1-after.wins[0])*s.policy.loss)-daily):willingness(s,before,after,operatingDaily-wageTotal(s,p),qualityDelta,games)+premium;
    if(urgent&&!short)valueCap=Math.max(valueCap,money((s.policy.win+s.policy.loss)/4));
    const cap=Math.min(valueCap,Math.floor(budget*[0,.3,.6,1][level]));
    return level&&valueCap>=500&&(includeUnfunded||cap>=500)?{level,cap,valueCap,premium,delta,qualityDelta,urgent,daily,operatingDaily,budget,replace,general:g}:null;
  }
  function saleCandidate(s,p,participants=null){const mine=roster(s,p);if(mine.length<4)return null;const pressure=p.debt>0||p.coins<reserve(s,p),before=evaluate(s,p),choices=mine.map(g=>{
      const remaining=mine.filter(q=>q.id!==g.id),after=evaluate(s,p,remaining);
      if(after.wins.some(win=>win===0))return null;
      const plan=(p.salePlans||[]).find(x=>x.outgoing===g.id),incoming=plan&&remaining.find(q=>q.id===plan.incoming);
      const loss=before.score-after.score,saving=costScore(s,p,wage(g,s.policy)),benefit=saving-Math.max(0,loss);
      const planned=Boolean(incoming&&!contract(s,incoming).short&&incoming.health>=s.policy.health+2&&loss<=saving+1e-8);
      const lowUse=usage(s,p,g)<.35,nearExit=g.health<=s.policy.health+10||g.age>=s.policy.age+7;
      const proactive=(lowUse||nearExit||mine.length>5)&&benefit>1e-8;
      let harvest=false;
      if(participants&&!pressure&&!planned&&mine.length>=5&&g.source!=='official'&&g.trainingOwner===p.id&&matureStarter(s,g)){
        const bids=s.players.filter(q=>q.id!==p.id&&participants.has(q.id)).map(q=>buyDemand(s,q,g)?.cap||0).filter(x=>x>=500).sort((a,b)=>b-a);
        const keepValue=willingness(s,after,before,wage(g,s.policy),loss,contract(s,g).games);
        harvest=bids.length>=2&&bids[1]*(1-taxRate(s,s.day))>=Math.max(500,keepValue);
      }
      const reason=planned?'换将后出售旧将':pressure?'资金压力出售':harvest?'培养兑现':proactive?(nearExit?'临近退出换代':'持有成本优化'):'出售冗余';
      return {g,loss,planned,benefit,proactive,harvest,reason};
    }).filter(x=>x&&(x.planned||pressure||x.loss<=1e-8||x.proactive||x.harvest));
    choices.sort((a,b)=>Number(b.planned)-Number(a.planned)||Number(b.harvest)-Number(a.harvest)||(pressure?a.loss-b.loss:b.benefit-a.benefit)||wage(b.g,s.policy)-wage(a.g,s.policy)||random(s.seed,'sale-tie',s.day,p.id,a.g.id)-random(s.seed,'sale-tie',s.day,p.id,b.g.id));return choices[0]?{...choices[0],pressure}:null;
  }

  function auction(s,g,seller=null,participation=new Set(s.players.map(p=>p.id)),limits=new Map()){
    const eligible=s.players.filter(p=>p.id!==seller?.id&&participation.has(p.id)&&(limits.get(p.id)||0)<1),order=shuffled(eligible,s.seed,'auction-order',s.day,g.id);let leading=null,price=0,bids=[];
    // 固定本场顺序轮流加10铜钱，最高出价者不自行抬价；只支付最后实际报价。
    const caps=order.map(p=>({p,demand:buyDemand(s,p,g)})).filter(x=>x.demand);if(!caps.length){s.markets.push({day:s.day,market:seller?'player':'official',general:{...g},sold:false,seller:seller?.id??null,bids:[]});return null;}
    let active=caps.slice();while(active.length){let raised=false;for(const x of active){if(x===leading)continue;const next=price?price+100:500;if(next<=x.demand.cap&&next<=x.p.coins){price=next;leading=x;bids.push({player:x.p.id,price});raised=true;}}
      if(!raised)break;active=active.filter(x=>x===leading||x.demand.cap>=price+100);
      if(active.length===1&&leading===active[0])break;
      if(bids.length>100000)throw Error('竞拍轮次异常');
    }
    const buyer=leading.p,amount=price,tax=seller?Math.round(amount*taxRate(s,s.day)):0;buyer.coins-=amount;const previous=g.owner;g.owner=buyer.id;
    cancelSalePlans(seller,g.id);buyer.recoveryFund=Math.max(0,(buyer.recoveryFund||0)-amount);
    if(seller){seller.coins+=amount-tax;s.stats.tax+=tax;emit(s,'trade',{[buyer.id]:{coins:-amount,assets:1},[seller.id]:{coins:amount-tax,assets:-1}},{general:g.id,amount,tax,buyer:buyer.id,seller:seller.id});clearDebt(s,seller);}else{s.stats.official+=amount;s.stats.bornOfficial++;emit(s,'official',{[buyer.id]:{coins:-amount,assets:1}},{general:g.id,amount,buyer:buyer.id});}
    const replace=leading.demand.replace;if(replace){planSale(buyer,replace,g.id);emit(s,'replacement',{}, {player:buyer.id,general:g.id,outgoing:replace,reason:'购入新将，挂牌旧将前复核两人的状态与阵容'});}
    limits.set(buyer.id,(limits.get(buyer.id)||0)+1);s.markets.push({day:s.day,market:seller?'player':'official',general:{...g,owner:previous},sold:true,price:amount,tax,buyer:buyer.id,seller:seller?.id??null,bids,delta:leading.demand.delta,qualityDelta:leading.demand.qualityDelta,replace:replace||null,holdingWage:leading.demand.daily,operatingWage:leading.demand.operatingDaily,level:leading.demand.level,cap:leading.demand.cap,valueCap:leading.demand.valueCap,premium:leading.demand.premium,urgent:leading.demand.urgent});return buyer;
  }
  // 行为参数是可解释的模拟假设；保留原随机键，资金限制在实际执行时判断。
  function consumptionProfile(s,p,day=s.day){
    const mine=roster(s,p),eligible=mine.filter(g=>!injured(g,day)&&g.score<g.potential),growth=clamp(mean(eligible.map(g=>g.potential-g.score))/20,0,1),base=p.group==='heavy'?.2:.1;
    const baseline=Math.max(1,3*base*s.policy.train+(p.group==='heavy'?.1:.05)*s.policy.recruit),stockPressure=clamp((p.jade-3*baseline)/(9*baseline),0,1);
    const trainingRate=eligible.length?Math.min(.9,base+.2*growth+.5*stockPressure):0;
    // 只为阵容深度与可见的退出风险增加寻访意愿，不因玉璧多便无限囤人。
    const risk=mine.some(g=>g.health<=s.policy.health+10||g.age>=s.policy.age+8),recruitRate=Math.min(.6,(p.group==='heavy'?.1:.05)+(mine.length<4?.35:mine.length<5?.15:0)+(risk?.25:0));
    return {trainingRate,recruitRate,growth,stockPressure,buffer:Math.ceil(3*(Math.min(3,eligible.length)*trainingRate*s.policy.train+recruitRate*s.policy.recruit))};
  }
  function intents(s,p,day){const profile=consumptionProfile(s,p,day);return {train:range(0,2).filter(i=>random(s.seed,'train-intent',day,p.id,i)<profile.trainingRate).length,recruit:random(s.seed,'recruit-intent',day,p.id)<profile.recruitRate,profile};}
  function consumptionRecord(s,p){if(p.consumption?.day!==s.day)p.consumption={day:s.day,trainWanted:0,recruitWanted:0,trained:0,recruited:0,blocks:{},profile:consumptionProfile(s,p),deferred:false,resumed:false};return p.consumption;}
  function consumptionBlocked(s,p,reason,count=1){const d=consumptionRecord(s,p);d.blocks[reason]=(d.blocks[reason]||0)+count;}
  function worthTraining(s,p){
    const mine=roster(s,p),before=evaluate(s,p,mine);
    const choices=mine.filter(g=>!injured(g,s.day)&&g.score<g.potential&&g.trainedDay!==s.day).map(g=>{
      const upgraded={...g,score:g.score+1},after=evaluate(s,p,mine.map(x=>x.id===g.id?upgraded:x));
      return {g,before,after,delta:after.score-before.score,wageChange:wage(upgraded,s.policy)-wage(g,s.policy)};
    }).filter(x=>x.delta>1e-8);
    choices.sort((a,b)=>b.delta-a.delta||random(s.seed,'train-tie',s.day,p.id,a.g.id)-random(s.seed,'train-tie',s.day,p.id,b.g.id));return choices[0]||null;
  }
  function expectedRecruit(s,p){return {id:'forecast-recruit-'+p.id,owner:p.id,source:'forecast',score:65,potential:80,age:20,health:95,injuryUntil:0,appearances:0,retired:false,trainedDay:0};}
  function recruitmentReserve(s,p){return (wageTotal(s,p)+money(30*s.policy.wage))*preferences[p.preference].reserve;}
  function observedCost(s,g){const prior=s.markets.filter(e=>e.sold&&e.market===(g.owner===null?'official':'player')&&band(e.general.score)===band(g.score)).slice(-10).map(e=>e.price);return prior.length?Math.max(500,median(prior)+100):500;}
  function jadePurchase(s,p,training,recruitment,target,emergency){
    const uses=[];
    if(training&&!emergency&&p.debt===0&&p.coins>=reserve(s,p)+training.wageChange*preferences[p.preference].reserve){
      const {g,before,after,delta,wageChange}=training;
      uses.push({fee:s.policy.train,value:willingness(s,before,after,wageChange,delta,contract(s,g).games),reason:'当天练兵'});
    }
    if(recruitment?.level&&(emergency||p.debt===0&&p.coins>=recruitmentReserve(s,p))){
      let value=willingness(s,recruitment.before,recruitment.after,recruitment.operatingDaily-wageTotal(s,p),recruitment.qualityDelta,18);
      if(emergency)value=Math.max(value,money((s.policy.win+s.policy.loss)/4));
      if(target&&target.cap>=target.priceGoal&&target.delta>=recruitment.delta)value=Math.min(value,target.priceGoal);
      uses.push({fee:s.policy.recruit,value,reason:emergency?'缺员寻访':'当天寻访'});
    }
    let stock=p.jade;
    for(const use of uses.filter(x=>x.fee>0).sort((a,b)=>b.value/b.fee-a.value/a.fee)){
      if(stock>=use.fee){stock-=use.fee;continue;}
      return {quantity:use.fee-stock,maxPrice:Math.floor(use.value/use.fee/10),reason:use.reason};
    }
    return null;
  }
  function plans(s,officials,listings,participation=new Set(s.players.map(p=>p.id))){const table=new Map();for(const p of s.players){const mine=roster(s,p),now=intents(s,p,s.day),ordinaryRecruit=now.recruit,training=now.train;const emergency=mine.length<3;
      now.train=training;now.recruit=emergency||now.recruit;let jadeTarget=0;for(let k=0;k<3;k++){const intention=k?intents(s,p,s.day+k):now;const possible=mine.filter(g=>g.score<g.potential&&g.injuryUntil<s.day+k).length;jadeTarget+=Math.min(intention.train,possible)*s.policy.train+(intention.recruit?s.policy.recruit:0);}
      let goldNeed=reserve(s,p)+p.debt;
      const playerOffers=participation.has(p.id)?listings.filter(x=>x.seller.id!==p.id).map(x=>x.g):[];
      const desired=[...playerOffers,...officials].map(g=>buyDemand(s,p,g,true)).filter(Boolean).map(x=>({...x,priceGoal:Math.min(x.valueCap,observedCost(s,x.general))}));
      const rate=money(s.lastRate||20),trainChoice=now.train?worthTraining(s,p):null,recruitChoice=now.recruit?assetOpportunity(s,p,expectedRecruit(s,p)):null;
      const trainValue=trainChoice?trainChoice.delta/Math.max(1,s.policy.train*rate):0,recruitValue=recruitChoice?.level?Math.max(0,recruitChoice.delta)/Math.max(1,s.policy.recruit*rate):0;
      desired.sort((a,b)=>Number(b.urgent)-Number(a.urgent)||(b.delta/Math.max(1,b.priceGoal)-a.delta/Math.max(1,a.priceGoal))||a.priceGoal-b.priceGoal);
      const target=desired[0]||null,marketPreferred=target&&(target.urgent||target.delta/Math.max(1,target.priceGoal)>=Math.max(trainValue,recruitValue));
      if(target)goldNeed=Math.max(goldNeed,target.daily*preferences[p.preference].reserve+Math.ceil(target.priceGoal/[0,.3,.6,1][target.level])+p.debt);
      // 余额尚不足起拍时，补强/补员意图仍可形成筹资需求。
      const evaluation=evaluate(s,p);if(emergency||evaluation.wins.some(v=>v===0))goldNeed=Math.max(goldNeed,500+(wageTotal(s,p)+money(30*s.policy.wage))*preferences[p.preference].reserve+p.debt);
      jadeTarget=Math.max(jadeTarget,now.profile.buffer);
      const urgent=p.debt>0||p.coins<reserve(s,p)||emergency||evaluation.wins.some(v=>v===0),deferred=urgent&&p.coins<goldNeed;
      // 优先购将时保护现有现金；未成交收入不进入预算。消费优先时留出偏好对应的储蓄份额。
      const spare=Math.max(0,p.coins-reserve(s,p)-p.debt),savingShare={battle:.5,steady:.4,asset:.6}[p.preference];
      const protectedGold=target?(marketPreferred?goldNeed:reserve(s,p)+p.debt+Math.min(Math.max(0,goldNeed-reserve(s,p)-p.debt),Math.round(spare*savingShare))):reserve(s,p)+p.debt;
      p.budget={day:s.day,wageReserve:reserve(s,p),purchaseTarget:target?.general.id||null,purchaseGoal:target?goldNeed:0,protectedGold,consumptionGold:Math.max(0,p.coins-protectedGold),preferred:marketPreferred?'购将':recruitValue>trainValue?'寻访':'练兵',trainValue,recruitValue,marketValue:target?target.delta/Math.max(1,target.priceGoal):0};
      const d=consumptionRecord(s,p);Object.assign(d,{trainWanted:now.train,recruitWanted:now.recruit?1:0,profile:now.profile,workingBuffer:jadeTarget,deferred:p.debt>0||p.coins<reserve(s,p)});
      // 暂缓只影响卖玉时的保留量；不抹去原始意愿，市场结算后用真实余额复核。
      const protectedJade=deferred?(emergency?s.policy.recruit:0):jadeTarget;
      table.set(p.id,{...now,ordinaryRecruit,jadeTarget:protectedJade,workingBuffer:jadeTarget,goldNeed,protectedGold,emergency,jadeBuy:jadePurchase(s,p,trainChoice,recruitChoice,target,emergency)});
    }return table;}
  function quote(s,p,dir,hasCounterparty=false){
    const previous=p.previousOrder;
    if(hasCounterparty&&previous?.counterparty&&previous.dir===dir&&previous.unfilled){
      const step=Math.max(1,Math.round(previous.price*.1));return Math.max(1,previous.price+(dir==='buy'?step:-step));
    }
    const ref=s.lastRate||20;return integer(s.seed,Math.max(1,Math.ceil(ref*.9)),Math.floor(ref*1.1),'fx-quote',s.day,p.id,dir);
  }
  function exchangeOrder(s,p,plan,hasCounterparty){
    const gap=plan.goldNeed-p.coins;
    if(gap>0&&p.jade>plan.jadeTarget){
      const price=quote(s,p,'sell',hasCounterparty);
      return {player:p.id,dir:'sell',quantity:Math.min(p.jade-plan.jadeTarget,Math.ceil(gap/(price*10))),price,reason:'筹措铜钱'};
    }
    if(p.jade>Math.max(2*plan.workingBuffer,plan.workingBuffer+Math.max(1,s.policy.train,s.policy.recruit))){
      return {player:p.id,dir:'sell',quantity:Math.ceil((p.jade-plan.workingBuffer)/3),price:quote(s,p,'sell',hasCounterparty),reason:'释放玉璧库存'};
    }
    const use=plan.jadeBuy;
    if(!use||use.maxPrice<1||p.debt>0&&!plan.emergency)return null;
    const discretionary=Math.max(0,p.coins-plan.protectedGold);
    const recovery=plan.emergency?Math.min(p.recoveryFund||0,Math.max(0,p.coins-reserve(s,p))):0;
    const budget=Math.max(discretionary,recovery),price=Math.min(use.maxPrice,quote(s,p,'buy',hasCounterparty));
    const quantity=Math.min(use.quantity,Math.floor(budget/(price*10)));
    return quantity?{player:p.id,dir:'buy',quantity,price,valueCap:use.maxPrice,reason:use.reason,recoveryBudget:recovery>discretionary}:null;
  }
  function exchangeOrders(s,table){
    const opening=s.players.map(p=>exchangeOrder(s,p,table.get(p.id),false)).filter(Boolean);
    const paired=opening.some(o=>o.dir==='buy')&&opening.some(o=>o.dir==='sell');
    let orders=paired?s.players.map(p=>exchangeOrder(s,p,table.get(p.id),true)).filter(Boolean):opening;
    if(paired&&(!orders.some(o=>o.dir==='buy')||!orders.some(o=>o.dir==='sell')))orders=opening;
    const active=new Set(orders.map(o=>o.player));for(const p of s.players)if(!active.has(p.id))p.previousOrder=null;
    return orders;
  }
  function allocate(orders,total,seed,key,side){let rest=total;const filled=new Map();for(const limit of [...new Set(orders.map(o=>o.price))].sort((a,b)=>side==='buy'?b-a:a-b)){
      const group=orders.filter(o=>o.price===limit),amount=sum(group.map(o=>o.quantity)),take=Math.min(rest,amount);if(take<=0)break;
      let used=0;for(const o of group){const q=Math.floor(take*o.quantity/amount);filled.set(o.player,q);used+=q;}
      let tails=take-used;for(const o of shuffled(group,seed,key,side,limit)){if(!tails)break;const prior=filled.get(o.player)||0;if(prior<o.quantity){filled.set(o.player,prior+1);tails--;}}
      rest-=take;
    }return filled;}
  function fxClear(orders,reference=20,seed='fx',key='batch'){
    const buys=orders.filter(o=>o.dir==='buy'),sells=orders.filter(o=>o.dir==='sell');if(!buys.length||!sells.length)return {price:null,quantity:0,buy:new Map(),sell:new Map()};
    // 有效量仅在订单限价处变化；每个常量区间只需检查最接近参考价的整数。
    const breaks=[1,...sells.map(o=>o.price),...buys.map(o=>o.price+1)].sort((a,b)=>a-b),unique=[...new Set(breaks)],prices=new Set();
    for(let i=0;i<unique.length;i++){const lo=unique[i],hi=(unique[i+1]??(Math.max(...buys.map(o=>o.price))+2))-1;if(hi<lo)continue;prices.add(clamp(Math.round(reference),lo,hi));}
    let best=null;for(const price of prices){const B=buys.filter(o=>o.price>=price),S=sells.filter(o=>o.price<=price),b=sum(B.map(o=>o.quantity)),a=sum(S.map(o=>o.quantity)),quantity=Math.min(a,b);if(!quantity)continue;
      const c={price,quantity,imbalance:Math.abs(a-b),distance:Math.abs(price-reference),tie:random(seed,key,'price',price),B,S};if(!best||c.quantity>best.quantity||c.quantity===best.quantity&&(c.distance<best.distance||c.distance===best.distance&&(c.imbalance<best.imbalance||c.imbalance===best.imbalance&&c.tie>best.tie)))best=c;
    }
    return best?{price:best.price,quantity:best.quantity,buy:allocate(best.B,best.quantity,seed,key,'buy'),sell:allocate(best.S,best.quantity,seed,key,'sell')}:{price:null,quantity:0,buy:new Map(),sell:new Map()};
  }
  function exchange(s,table){const orders=exchangeOrders(s,table),match=fxClear(orders,s.lastRate||20,s.seed,'fx-'+s.day),B=[...match.buy].filter(x=>x[1]>0).map(([id,q])=>({id,q})),S=[...match.sell].filter(x=>x[1]>0).map(([id,q])=>({id,q}));let i=0,j=0;
    while(i<B.length&&j<S.length){const q=Math.min(B[i].q,S[j].q),buyer=s.players[B[i].id],seller=s.players[S[j].id],coins=q*match.price*10;buyer.coins-=coins;buyer.jade+=q;buyer.recoveryFund=Math.max(0,(buyer.recoveryFund||0)-coins);seller.coins+=coins;seller.jade-=q;emit(s,'exchange',{[buyer.id]:{coins:-coins,jade:q},[seller.id]:{coins,jade:-q}},{buyer:buyer.id,seller:seller.id,price:match.price,quantity:q,amount:coins});clearDebt(s,seller);B[i].q-=q;S[j].q-=q;if(!B[i].q)i++;if(!S[j].q)j++;}
    const sides=new Set(orders.map(o=>o.dir));
    for(const o of orders){const filled=(o.dir==='buy'?match.buy:match.sell).get(o.player)||0;s.players[o.player].previousOrder={dir:o.dir,price:o.price,unfilled:filled<o.quantity,counterparty:sides.size===2};s.orders.push({day:s.day,...o,filled});}
    if(match.quantity)s.lastRate=match.price;s.fx.push({day:s.day,price:match.price,quantity:match.quantity,reference:s.lastRate||20,orders:orders.length});
  }
  function recharge(s){for(const p of s.players){const n=p.group==='heavy'?integer(s.seed,25,50,'recharge',s.day,p.id):p.group==='light'?integer(s.seed,5,15,'recharge',s.day,p.id):0;if(!n)continue;p.jade+=n;s.stats.recharge+=n;emit(s,'recharge',{[p.id]:{jade:n}},{amount:n});}}
  function recruitment(s,p,wants){const emergency=roster(s,p).length<3;if(!emergency&&!wants){if(p.consumption?.recruitWanted)consumptionBlocked(s,p,'交易已补齐阵容');return;}const d=consumptionRecord(s,p);
    if(d.recruited){consumptionBlocked(s,p,'达到每日寻访上限');return;}
    if(p.debt>0&&!emergency){consumptionBlocked(s,p,'尚有欠饷');return;}
    if(!emergency&&p.coins<recruitmentReserve(s,p)){consumptionBlocked(s,p,'军饷储备不足');return;}
    const opportunity=!emergency?assetOpportunity(s,p,expectedRecruit(s,p)):null;if(opportunity&&!opportunity.level){consumptionBlocked(s,p,'寻访预期收益不足');return;}
    if(p.jade<s.policy.recruit){consumptionBlocked(s,p,'玉璧不足');emit(s,'unmet',{}, {player:p.id,reason:'寻访玉璧不足',emergency});return;}
    p.jade-=s.policy.recruit;s.stats.recruitment+=s.policy.recruit;const g=generate(s.seed,'r-'+s.day+'-'+p.id,p.id,'recruit',s.day),realised=!emergency?assetOpportunity(s,p,g):null;s.generals.push(g);s.stats.bornRecruit++;d.recruited++;if(realised?.level&&realised.replace)planSale(p,realised.replace,g.id);emit(s,'recruit',{[p.id]:{jade:-s.policy.recruit,assets:1}},{general:g.id,amount:s.policy.recruit,emergency,replace:realised?.level?realised.replace:null});}
  function training(s,p,count){const d=consumptionRecord(s,p);count=Math.min(count,3-d.trained);if(!count)return;if(p.debt){consumptionBlocked(s,p,'尚有欠饷',count);return;}if(roster(s,p).length<3){consumptionBlocked(s,p,'先补齐阵容',count);return;}for(let i=0;i<count;i++){
    if(p.jade<s.policy.train){consumptionBlocked(s,p,'玉璧不足',count-i);emit(s,'unmet',{}, {player:p.id,reason:'练兵玉璧不足'});break;}
    const choice=worthTraining(s,p);if(!choice){consumptionBlocked(s,p,'无可获益的练兵对象',count-i);break;}const g=choice.g;
    const afterWage=wageTotal(s,p)-wage(g,s.policy)+wage({...g,score:g.score+1},s.policy);
    if(p.coins<afterWage*preferences[p.preference].reserve){consumptionBlocked(s,p,'军饷储备不足',count-i);break;}
    const from=g.score;p.jade-=s.policy.train;g.score++;g.trainedDay=s.day;g.trainingOwner=p.id;d.trained++;s.stats.training+=s.policy.train;emit(s,'training',{[p.id]:{jade:-s.policy.train}},{general:g.id,from,to:g.score,amount:s.policy.train});}}
  function recoveryLineup(s,p,line){
    const owned=roster(s,p);
    if(owned.length>=3)return line;
    p.recoveryActive=true;
    const loans=Array.from({length:3-owned.length},(_,i)=>({id:'loan-'+p.id+'-'+i,score:55,injuryUntil:0,loan:true}));
    emit(s,'recovery',{}, {player:p.id,loans:loans.length,reason:'军府借将补齐首发'});
    return [...owned,...loans];
  }
  function closeRecovery(s,p){
    if(!p.recoveryActive||roster(s,p).length<3)return;
    p.recoveryActive=false;p.recoveryFund=0;
    s.stats.recovered=(s.stats.recovered||0)+1;
    emit(s,'recovery',{}, {player:p.id,restored:true,reason:'真实阵容补齐，归还借将并释放补员储备'});
  }
  function settleRecovery(s,p,matchIncome,wagePaid){
    const surplus=Math.max(0,Math.min(matchIncome-wagePaid,p.coins-(p.recoveryFund||0)));
    const debtPaid=clearDebt(s,p,Math.floor(surplus*.7));
    const saved=surplus-debtPaid;
    p.recoveryFund=(p.recoveryFund||0)+saved;
    s.stats.recoveryRewards=(s.stats.recoveryRewards||0)+matchIncome;
    s.stats.recoveryDebtPaid=(s.stats.recoveryDebtPaid||0)+debtPaid;
    emit(s,'recovery',{}, {player:p.id,matchIncome,wagePaid,debtPaid,saved,fund:p.recoveryFund,reason:'借将收入结算'});
  }
  function matches(s,info){
    const wages=new Map(s.players.map(p=>[p.id,wageTotal(s,p)])),evaluations=new Map(s.players.map(p=>[p.id,evaluate(s,p)]));
    const lineups=new Map(s.players.map(p=>[p.id,recoveryLineup(s,p,evaluations.get(p.id).lineup.map(id=>s.generals.find(g=>g.id===id)).filter(g=>g&&!g.retired&&g.owner===p.id))]));
    const played=new Set(),newInjuries=[],recoveryIncome=new Map();
    for(const p of s.players){const e=evaluations.get(p.id),line=lineups.get(p.id),loans=line.filter(g=>g.loan).length,ageNeeds=line.filter(g=>g.age>=s.policy.age&&g.appearances<g.age-s.policy.age+1).length,reason=loans?'军府借将 '+loans+' 名补齐首发':preferences[p.preference].name+'；比较争胜、健康和长期留存'+(ageNeeds?'；本场为'+ageNeeds+'名武将累计年龄门槛出场':'');p.decision={day:s.day,score:e.score,parts:e.parts.slice(),wins:e.wins.slice(),reason,loans};emit(s,'decision',{}, {player:p.id,...p.decision});}
    for(const [ai,bi] of s.schedules[info.season][info.round]){const a=s.players[ai],b=s.players[bi],A=lineups.get(ai),B=lineups.get(bi),complete=A.length===3&&B.length===3;let winner=null;
      if(complete){const chance=probability(mean(A.map(g=>effective(g,s.day))),mean(B.map(g=>effective(g,s.day))));winner=random(s.seed,'result',s.day,Math.min(ai,bi),Math.max(ai,bi))<chance?a:b;s.stats.normal++;
        for(const g of [...A,...B])if(!g.loan){played.add(g.id);g.appearances++;}
        const eligible=[...A,...B].filter(g=>!g.loan&&!injured(g,s.day));if(eligible.length&&random(s.seed,'injury',s.day,Math.min(ai,bi),Math.max(ai,bi))<.05){const chosen=eligible.slice().sort((x,y)=>random(s.seed,'injured-general',s.day,Math.min(ai,bi),Math.max(ai,bi),x.id)-random(s.seed,'injured-general',s.day,Math.min(ai,bi),Math.max(ai,bi),y.id))[0];newInjuries.push({g:chosen,days:integer(s.seed,1,5,'injury-duration',s.day,chosen.id),damage:integer(s.seed,1,5,'injury-damage',s.day,chosen.id)});}
        const loans=[...A,...B].filter(g=>g.loan).map(g=>({id:g.id,score:g.score,injuryUntil:0}));
        if(loans.length)s.stats.recoveryMatches=(s.stats.recoveryMatches||0)+1;
        emit(s,'match',{}, {a:ai,b:bi,winner:winner.id,chance,lineups:[A.map(g=>g.id),B.map(g=>g.id)],loans,status:'normal'});
      }else if(A.length===3||B.length===3){winner=A.length===3?a:b;s.stats.singleForfeit++;emit(s,'match',{}, {a:ai,b:bi,winner:winner.id,status:'single-forfeit'});}else{s.stats.doubleForfeit++;emit(s,'match',{}, {a:ai,b:bi,winner:null,status:'double-forfeit'});}
      for(const p of [a,b]){
        const line=lineups.get(p.id),recovering=line.some(g=>g.loan);
        p.lastLineup=line.filter(g=>!g.loan).map(g=>g.id);
        if(p===winner)p.wins++;else p.losses++;
        const income=p===winner||complete?reward(s,p,p===winner?s.policy.win:s.policy.loss,recovering):0;
        if(recovering)recoveryIncome.set(p.id,income);
      }
    }
    for(const p of s.players){const paid=payWage(s,p,wages.get(p.id));if(recoveryIncome.has(p.id))settleRecovery(s,p,recoveryIncome.get(p.id),paid);}
    for(const g of s.generals.filter(g=>g.owner!==null&&!g.retired)){if(played.has(g.id))g.health-=2;else if(!injured(g,s.day))g.health=Math.min(100,g.health+1);}
    for(const n of newInjuries){n.g.injuryUntil=s.day+n.days;n.g.health-=n.damage;emit(s,'injury',{}, {general:n.g.id,player:n.g.owner,duration:n.days,damage:n.damage});}
    for(const g of s.generals.filter(g=>g.owner!==null&&!g.retired&&g.health<s.policy.health))retire(s,g,'health');
  }
  function step(s){if(s.complete)return false;s.day++;evaluationCache.delete(s);const info=dayInfo(s.day);
    if(info.local===1){for(const p of s.players){p.wins=0;p.losses=0;}for(const g of s.generals)g.appearances=0;}
    for(const p of s.players)if(p.salePlans){const held=new Set(roster(s,p).map(g=>g.id));p.salePlans=p.salePlans.filter(plan=>held.has(plan.outgoing)&&held.has(plan.incoming));}
    recharge(s);const count=info.local===6?s.policy.official6:info.local===12?s.policy.official12:0,officials=range(0,count-1).map(i=>{const type=i<count/2?'ready':'potential';return generate(s.seed,'o-'+info.season+'-'+info.local+'-'+type+'-'+(i%(count/2)),null,'official',s.day,type);});
    s.generals.push(...officials);s.stats.officialPlanned+=count;
    const participation=new Set(s.players.filter(p=>roster(s,p).length<3||random(s.seed,'market-participation',s.day,p.id)<.8).map(p=>p.id)),listings=[];
    for(const p of s.players){if(random(s.seed,'market-participation',s.day,p.id)>=listingProbability(taxRate(s,s.day)))continue;const c=saleCandidate(s,p,participation);if(c)listings.push({g:c.g,seller:p,loss:c.loss,pressure:c.pressure,reason:c.reason});}
    const table=plans(s,officials,listings,participation);exchange(s,table);const buys=new Map();
    for(const l of shuffled(listings,s.seed,'listing-order',s.day)){const current=roster(s,l.seller);if(l.g.retired||l.g.owner!==l.seller.id||current.length<4)continue;auction(s,l.g,l.seller,participation,buys);Object.assign(s.markets.at(-1),{saleLoss:l.loss,fundingPressure:l.pressure,saleReason:l.reason});}
    const officialLimits=new Map();for(const g of shuffled(officials,s.seed,'official-listing-order',s.day))if(!auction(s,g,null,new Set(s.players.map(p=>p.id)),officialLimits))s.stats.officialUnsold++;
    for(const p of s.players){recruitment(s,p,table.get(p.id).ordinaryRecruit);closeRecovery(s,p);}
    for(const p of s.players)training(s,p,table.get(p.id).train);
    for(const p of s.players){const d=p.consumption;d.budget={...p.budget};d.resumed=d.deferred&&p.debt===0&&(d.trained+d.recruited>0);emit(s,'consumption',{}, {player:p.id,reason:'计划练兵'+d.trainWanted+'／寻访'+d.recruitWanted+'；完成'+d.trained+'／'+d.recruited+(d.resumed?'；市场后恢复消费':'')+(Object.keys(d.blocks).length?'；'+Object.entries(d.blocks).map(([k,v])=>k+' '+v+'次').join('、'):''),...JSON.parse(JSON.stringify(d))});}
    if(info.match)matches(s,info);else for(const g of s.generals.filter(g=>g.owner!==null&&!g.retired&&!injured(g,s.day)))g.health=Math.min(100,g.health+1);
    if(info.local===11)seasonEnd(s);s.complete=s.day===120;s.days.push(snapshot(s));const check=audit(s);if(!check.ok)throw Error('第'+s.day+'天：'+check.errors.join('；'));return true;
  }
  function run(input,seed){const s=create(input,seed);while(step(s));return s;}
  const median=a=>{if(!a.length)return null;const b=a.slice().sort((x,y)=>x-y),m=Math.floor(b.length/2);return b.length%2?b[m]:(b[m-1]+b[m])/2;};
  const band=score=>score<60?0:score<70?1:score<80?2:score<90?3:4;
  function marketRows(s,season=null){const base=s.markets.filter(e=>season===null||dayInfo(e.day).season===season),out=[];for(const market of ['player','official'])for(const kind of market==='player'?[0,1,2,3,4]:['ready','potential']){const all=base.filter(e=>e.market===market&&(market==='player'?band(e.general.score)===kind:e.general.type===kind)),sold=all.filter(e=>e.sold),prices=sold.map(e=>shown(e.price));out.push({market,kind,count:sold.length,listed:all.length,unsold:all.length-sold.length,mean:prices.length?mean(prices):null,median:median(prices),age:sold.length?mean(sold.map(e=>e.general.age)):null,potential:sold.length?mean(sold.map(e=>e.general.potential)):null,health:sold.length?mean(sold.map(e=>e.general.health)):null,injured:sold.length?sold.filter(e=>injured(e.general,e.day)).length/sold.length:null});}return out;}
  const api={VERSION,initialJadePerPlayer,defaultSeed,defaults,fields,preferences,groups,create,step,run,audit,snapshot,marketRows,dayInfo,shown,random,validatePolicy,listingProbability,roster,wageTotal,evaluate,_test:{generate,wage,probability,fxClear,allocate,quote,auction,reward,payWage,retire,seasonEnd,saleCandidate,clearDebt,buyDemand,intents,training,recruitment,matches,consumptionProfile,plans,exchangeOrders,exchange,assetOpportunity,expectedRecruit,costScore,usage}};
  // 自包含源码可构建Blob Worker，file://打开也不需要fetch或importScripts。
  api.workerSource='('+FengceSimulationModule.toString()+')(self);';
  root.FengceSim=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
