export const units = [
  {id:1, title:'心情与问候', subtitle:'Feelings & greetings', cue:'happy, sad, boy…'},
  {id:2, title:'我的家人', subtitle:'My family', cue:'father, mother, sister…'},
  {id:3, title:'认识自己', subtitle:'All about me', cue:'head, eye, mouth…'},
  {id:4, title:'一起动起来', subtitle:'Let’s move', cue:'run, jump, park…'},
  {id:5, title:'美味食物', subtitle:'Food & fruit', cue:'milk, apple, banana…'},
  {id:6, title:'动物朋友', subtitle:'Animal friends', cue:'rabbit, cat, dog…'},
  {id:7, title:'看看天气', subtitle:'Weather & nature', cue:'sunny, windy, rain…'},
  {id:8, title:'生日快乐', subtitle:'Happy birthday', cue:'cake, gift, candle…'},
  {id:0, title:'专有名词', subtitle:'Proper nouns', cue:'China, Thailand, UK'}
];

// Photos are the source of the wording and order; * preserves the textbook's star marker.
const source = [
[1, `*happy|ˈhæpi|开心的
*sad|sæd|伤心的
*angry|ˈæŋɡri|生气的
*tired|taɪəd|疲倦的
*boy|bɔɪ|男孩
*girl|ɡɜːl|女孩
*I|aɪ|我
*am|æm|是
*cold|kəʊld|冷的
*OK|ˌəʊˈkeɪ|对；好；行
*find|faɪnd|找到
*pencil|ˈpensəl|铅笔
*too|tuː|也；太
*well|wel|好；就这样；好啦
*now|naʊ|现在
look at the blackboard|lʊk æt ðə ˈblækbɔːd|看黑板|phrase
Good morning.|ɡʊd ˈmɔːnɪŋ|上午好。|sentence
How are you?|haʊ ɑː juː|你好吗？|sentence
Not so good.|nɒt səʊ ɡʊd|不太好。|sentence
Let’s close the window.|lets kləʊz ðə ˈwɪndəʊ|我们把窗户关上吧。|sentence
Fine, thank you.|faɪn θæŋk juː|很好，谢谢。|sentence`],
[2, `*grandfather|ˈɡrænfɑːðə|（外）祖父；爷爷；外公|word|也可说 grandpa /ˈɡrænpɑː/
*grandmother|ˈɡrænmʌðə|（外）祖母；奶奶；外婆|word|也可说 grandma /ˈɡrænmɑː/
*father|ˈfɑːðə|爸爸
*mother|ˈmʌðə|妈妈
*sister|ˈsɪstə|姐姐；妹妹
*brother|ˈbrʌðə|哥哥；弟弟
*me|miː|我
*family|ˈfæməli|家庭
*my|maɪ|我的
*name|neɪm|名字
*is|ɪz|是
*this|ðɪs|这；这个
*and|ænd|和
*she|ʃiː|她
*he|hiː|他
*who|huː|谁
twin|twɪn|双胞胎之一
*big|bɪɡ|大的
family tree|ˌfæməli ˈtriː|家庭树|phrase
Hi.|haɪ|嗨，你好。|sentence`],
[3, `*head|hed|头
*eye|aɪ|眼睛
*ear|ɪə|耳朵
*mouth|maʊθ|嘴巴
*hair|heə|头发
*nose|nəʊz|鼻子
*face|feɪs|脸
*a / an|ə; ən|一；一个|word||a, an
haircut|ˈheəkʌt|理发；发型
*your|jɔː|你的；你们的
*long|lɒŋ|长的
*but|bʌt|但是
*like|laɪk|喜欢
*see|siː|看见
*sit|sɪt|坐
*on|ɒn|在……上
*chair|tʃeə|椅子
*please|pliːz|请
*you|juː|你；你们
*have|hæv|有
*short|ʃɔːt|短的；个子矮的
*mum|mʌm|妈妈
You look great!|juː lʊk ɡreɪt|你看起来很棒！|sentence`],
[4, `skip|skɪp|跳绳
*run|rʌn|跑
fly a kite|flaɪ ə kaɪt|放风筝|phrase
skateboard|ˈskeɪtbɔːd|滑滑板
ride a bike|raɪd ə baɪk|骑自行车|phrase
*child|tʃaɪld|孩子|word|复数 children /ˈtʃɪldrən/
*in|ɪn|在……里面
*the|ðə; ðiː|（表示特指）
*park|pɑːk|公园
*are|ɑː|是
*can|kæn|能够
fun|fʌn|有趣的；乐趣
*fast|fɑːst|快的；快；快速
*help|help|帮助
together|təˈɡeðə|一起
*get|ɡet|去取；得到；获得
*bring|brɪŋ|带来
*jump|dʒʌmp|跳
Hello.|həˈləʊ|喂，你好。|sentence`],
[5, `*milk|mɪlk|牛奶
*juice|dʒuːs|果汁
*tomato|təˈmɑːtəʊ|西红柿
carrot|ˈkærət|胡萝卜
*apple|ˈæpəl|苹果
*banana|bəˈnɑːnə|香蕉
*grape|ɡreɪp|葡萄
*meat|miːt|肉
*fish|fɪʃ|鱼；鱼肉
funny|ˈfʌni|有趣的
*food|fuːd|食物
*what|wɒt|什么
*some|sʌm|一些
*fruit|fruːt|水果
*vegetable|ˈvedʒtəbəl|蔬菜
*cut|kʌt|切
*we|wiː|我们
*no|nəʊ|不；不是
*for|fɔː|（表示对象、用途等）给；对
*yes|jes|是的
*chicken|ˈtʃɪkɪn|鸡肉
*soup|suːp|汤`],
[6, `squirrel|ˈskwɪrəl|松鼠
*rabbit|ˈræbɪt|兔子
*cat|kæt|猫
*mouse|maʊs|老鼠|word|复数 mice /maɪs/
*dog|dɒɡ|狗
frog|frɒɡ|青蛙
*day|deɪ|白天；一天
*it|ɪt|它
*nice|naɪs|美好的
*has|hæz|有|word|have 的第三人称单数
*small|smɔːl|小的
*cute|kjuːt|可爱的
*that|ðæt|那；那个
*they|ðeɪ|他们；她们；它们
*tail|teɪl|尾巴
*two|tuː|二；二个（人或物）
*animal|ˈænɪməl|动物
*eat|iːt|吃
*bad|bæd|坏的
bug|bʌɡ|虫子`],
[7, `*sunny|ˈsʌni|晴朗的
*sun|sʌn|太阳
*windy|ˈwɪndi|刮风的
wind|wɪnd|风
rainy|ˈreɪni|下雨的
*rain|reɪn|雨；下雨
*cloudy|ˈklaʊdi|多云的
cloud|klaʊd|云
different|ˈdɪfərənt|不同的
*weather|ˈweðə|天气
*how|haʊ|怎样；如何
*today|təˈdeɪ|今天
hat|hæt|帽子
*plant|plɑːnt|植物
*hot|hɒt|热的
*very|ˈveri|非常
go to the park|ɡəʊ tə ðə pɑːk|去公园|phrase
Hooray!|hʊˈreɪ|好极了！|sentence
Oh, dear!|əʊ dɪə|哦，天哪！|sentence`],
[8, `*cake|keɪk|蛋糕
*candle|ˈkændəl|蜡烛
*gift|ɡɪft|礼物
*toy plane|tɔɪ pleɪn|玩具飞机|phrase
*doll|dɒl|玩具娃娃
*card|kɑːd|卡片
*noodles|ˈnuːdəlz|面条
*come|kʌm|来
*love|lʌv|爱
*dad|dæd|爸爸
*afternoon|ˌɑːftəˈnuːn|下午
*share|ʃeə|分享
*his|hɪz|他的
*evening|ˈiːvnɪŋ|傍晚；晚上
ten years old|ten jɪəz əʊld|十岁|phrase
go out|ɡəʊ aʊt|出去|phrase
Happy birthday!|ˈhæpi ˈbɜːθdeɪ|生日快乐！|sentence
What a lovely picture!|wɒt ə ˈlʌvli ˈpɪktʃə|多么可爱的一幅画啊！|sentence`],
[0, `China|ˈtʃaɪnə|中国
Thailand|ˈtaɪlænd|泰国
UK|ˌjuː ˈkeɪ|英国`]
];

export const entries = source.flatMap(([unit, text]) => text.split('\n').map((line,index) => {
  const [marked, ipa, meaning, type = 'word', note = '', speak] = line.split('|');
  const word = marked.replace(/^\*/, '');
  return {id:`u${unit}-${index+1}`,unit,word,ipa,meaning,type,note,speak:speak || word,starred:marked.startsWith('*')};
}));
