-- 既存の経歴データ（lib/prompt.ts の BIO）を、経験談として入れる。
-- テーブルも供給者も作成済みなので、これは experiences に中身を入れるだけ。
-- Supabase の SQL Editor で実行する（SQL Editor は RLS を迂回するので鍵は要らない）。
--
-- 紐づけ先の供給者（登録済み）: ntk / f30b4340-cb90-4316-b1fe-aed930c09897
--
-- 本文は BIO のまま。出来事ごとに切り分けてタグを付けただけで、書き足し・要約はしていない。
-- 経験談 49 件（エピソード 48 件 ＋ 持論 1 件）。
--
-- 二重に流すと同じ経験談が重複して入る（本文に unique 制約は無い）。
-- 入れ直すときは、先に既存分を消してから流すこと：
--   delete from experiences where account_id = 'f30b4340-cb90-4316-b1fe-aed930c09897';

-- ───────── 幼少期 ─────────

-- 障害のある姉が当たり前の家で育った
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['家族/障害', '生い立ち'], $exp$香川県高松市生まれ。4人きょうだい末っ子。4歳上の姉に身体障害があり、それが当たり前の環境で育った。$exp$);

-- 没頭すると周りが見えなくなる子だった
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['没頭/集中', '自分の特性'], $exp$レゴ・プラレール・恐竜・虫・電車に異常に没頭。家族に「没頭すると周りが見えなくなる子」と言われていた。$exp$);

-- 対象年齢より上の玩具を組み上げた／4歳で九九
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['没頭/集中', '子ども/得意'], $exp$6歳で対象年齢12歳向けの玩具を説明書なしで約5時間で完成。4歳で九九を全部言えた。$exp$);

-- 保育園で「やめよう」と言える子だった
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['正義感', '人間関係/子ども'], $exp$保育園では正義感が強く「そういうこと言うのやめよう」と言える子。先生に「将来は研究者になると思っていた」と言われた。$exp$);

-- 3歳で麻酔なしで縫ったが泣かなかった
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['怪我', '子ども/気質'], $exp$3歳でガラスに頭をぶつけ麻酔なしで縫ったが泣かなかった。$exp$);

-- 医者になる夢と、6歳での野球の始まり
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['夢/将来', '野球/はじまり'], $exp$夢は医者でブラック・ジャックを読み込んでいた。6歳で野球開始。$exp$);

-- 初恋の相手を取られたと感じて傷ついた
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['恋愛/失恋', '子ども/傷'], $exp$初恋の相手を取られたと感じ大きく傷ついた。$exp$);

-- ───────── 小学校 ─────────

-- 低学年は内向的で、いじられる側だった
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['人間関係/いじられる', '内向的'], $exp$低学年は内向的で、体は大きいのにあまり喋らずいじられる側だった。$exp$);

-- 野球が嫌いで、始めたこと自体が失敗だと思っていた
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['野球/嫌い', '好きになれない'], $exp$野球が嫌いで練習に行きたくなかった。「野球を始めたこと自体が失敗だった」と思っていた。$exp$);

-- できなかったことができた瞬間に、野球が好きになった
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['苦手→好き', '野球/転機'], $exp$小3、ピッチャーで初めてストライクが入るようになり、できなかったことができた瞬間に野球が好きになった。$exp$);

-- 先生に反抗したのをきっかけにクラスの中心になった
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['学校/立ち位置', '勉強/成績'], $exp$小4以降クラスの中心に。先生に反抗したのがきっかけで注目された。テストはほぼ100点。$exp$);

-- 憧れの選手を真似て左投げも練習した／人を観察して取り入れる
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['観察/模倣', '没頭/集中'], $exp$プロ野球選手の図鑑を読み込み、右利きなのに憧れの左投手を真似て左投げも練習した。人の字・姿勢・動き・考え方を観察して取り入れるのが好きで「その人になった感覚」が楽しかった。$exp$);

-- 「ゴリラ」と呼ばれ、自分で呼ばれ方を意味づけし直した
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['容姿/からかい', '言い換え/捉え直し'], $exp$「ゴリラ」と呼ばれて傷ついたが、甲子園雑誌で岡本和真が「ゾウ」と呼ばれていたのを見て「ゴリラじゃなくてゾウって呼んで」と言い返した。呼ばれ方を自分で意味づけし直した。$exp$);

-- 一度落ちた選抜に、補欠から入った
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['選考/落選', '野球/選抜'], $exp$小6でプロ野球ジュニア選抜、一度落ちたが辞退者が出て補欠から入った。$exp$);

-- 肩を痛め、好きなのにできない絶望を初めて味わった
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['怪我', '好きなのにできない'], $exp$肩の前側を痛め、好きなのにできない絶望を初めて味わった。$exp$);

-- ───────── 中学 ─────────

-- 身長が16cm伸びて投球感覚が崩壊した
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['スポーツ/スランプ', '体の変化'], $exp$市内で名前を知られた状態で入学。中1で身長が16cm伸び投球感覚が崩壊。フォームもリリース位置も全部追いつかなかった。$exp$);

-- スライダーの感覚を掴んで大会MVPになった
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['野球/成功', '転機'], $exp$途中でスライダーの感覚を掴み大会MVP、「誰にも打たれない」感覚を持つほど活躍。$exp$);

-- 愚痴が広まって、初めて人から嫌われた
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['人間関係/信頼', '陰口'], $exp$中2、彼女と5ヶ月で別れた後に友達へ愚痴を話したらそれが広まった。初めて人から嫌われる経験。$exp$);

-- 誰が嫌っているのか気になって、本人に確認して回った
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['人間関係/嫌われる', '不安'], $exp$クラスに自分を強く嫌う人が3〜4人いた。誰が嫌ってるのか気になって、一人ひとりに「俺のこと嫌い？」と確認して回るほど来ていた。$exp$);

-- 12球連続ボールからイップスになった
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['スポーツ/イップス', '突然できなくなる'], $exp$中3、東日本選抜の大会で2番手登板、突然ストライクが入らず12球連続ボール。ここからイップス。それ以前は楽天から「将来有望」と評価されていた。$exp$);

-- 好きだった野球が苦しくなった
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['好きなことが嫌いになる', 'スポーツ/挫折'], $exp$全国大会ベスト8。好きだった野球が苦しくなった。$exp$);

-- 原因が分からず、誰にも相談できなかった
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['孤独/相談できない', '理解されない'], $exp$原因が分からないのが一番きつかった。誰に相談していいか分からず「理解してくれる人はいないんじゃないか」と思い、結局誰にも言えなかった。$exp$);

-- 距離を置くと楽になったが、戻ると感覚も戻った
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['距離を置く', '回復'], $exp$一度距離を置くと楽になったが、実戦に戻ると感覚も戻った。$exp$);

-- 匿名の質問箱が誹謗中傷で埋まった
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['SNS/誹謗中傷', '匿名/中傷'], $exp$コロナ禍で生活が一変。別の彼女と別れた後、Instagramの匿名質問箱が誹謗中傷で埋まった。「最低」「クズ。消えろ」「調子乗んな」「前から嫌いだった」。誰が送ったか分からず、友達に聞いても「知らない」しか返ってこない。$exp$);

-- 傷と向き合う時間もないまま、友達を信頼できなくなった
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['人間関係/信頼', '傷が残る'], $exp$野球が忙しくて傷と向き合う時間もないのに忘れることもできない。中学の友達を信頼できなくなった。$exp$);

-- ───────── 高校 ─────────

-- 寮の4人部屋と上下関係のストレス
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['寮生活', '上下関係'], $exp$寮生活（4人部屋）。上下関係のストレス。ただ先輩の指導は半分エンタメとして楽しめる部分もあった。$exp$);

-- 学年30位以内を維持する一方、人生最低点も取った
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['勉強/成績', '得意と苦手'], $exp$学年300人弱で30位以内を維持、オール5に近い成績。一方で世界史37点という人生最低点も取っている。$exp$);

-- 相談を受けるうちに、イップスの経験が人の役に立つと気づいた
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['経験が役に立つ', '相談を受ける'], $exp$高1で初めての彼女。野球部内でも相談を受けることが多く、中学のイップス経験が他人の相談に活きると気づいた。$exp$);

-- 結果を出したのに怪我でベンチ入りを逃し、毎日自分を責めた
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['怪我', '努力が報われない'], $exp$高2、名門校を抑える結果を出したが怪我でベンチ入りを逃した。誰よりも努力したのになぜ、と毎日自分を責め「何をしてるんだ自分は」と思い続けた。$exp$);

-- 浮気を誤解され、狭い生活圏で噂が広まった
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['誤解/噂', 'SNS/誹謗中傷'], $exp$高2冬、相手の浮気を疑う出来事があり、逆に自分が浮気したと誤解された。学年中に噂が広まり誹謗中傷を受けた。狭い生活圏で毎日顔を合わせる環境が中学よりきつかった。$exp$);

-- 吹っ切るために、知らない街まで出て新しい出会いを探した
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['環境を変える', '立て直す'], $exp$吹っ切るため大宮駅まで出て新しい出会いを探した。$exp$);

-- 肘の怪我で、一番大きな柱を自分の意思で手放した
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['引退/やめる', '進路/決断'], $exp$高3、肘の怪我で野球を断念。監督と部長に「大学でも続けろ」と言われたが全面的に拒否。小学生から続いた一番大きな柱を自分の意思で手放した。$exp$);

-- 学校内で孤立し、行かないという選択をした
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['孤独/孤立', '嫌がらせ'], $exp$高3の10〜11月、学校内で目をつけられ孤立。呼び出されるような嫌がらせもあったが行かないという選択をした。今でも思い出したくない時期。自分でも当時の振る舞いに良くなかった部分があったと客観的に思っている。$exp$);

-- 周囲の期待より自分の直感を優先すると決めた
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['進路/決断', '直感を優先'], $exp$「起業して大きく稼ぐ」方向へ進むと決め、周囲の期待より自分の直感を優先した。$exp$);

-- ───────── 大学・現在 ─────────

-- 人間関係を広げた一方、妬みや陰口も受けた
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['人間関係/妬み', '目立つこと'], $exp$経済学部進学、入学時点で起業志向。サークルに入らず学年のほとんどを知るくらい人間関係を広げた。目立つことで妬みも受け、話していることを裏で笑われることもあった。$exp$);

-- 努力しても伸びなかったTOEICを、2ヶ月で200点上げた
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['勉強/停滞', 'やり方を変える'], $exp$TOEIC入学時465点、努力しても495点で停滞しクラスも下がり「なぜ努力してるのに結果が出ないんだ」と悔しかった。向き合い直して約2ヶ月で200点以上上げ725点。$exp$);

-- 焦りから投資詐欺で10万円を失った
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['お金/詐欺', '焦り'], $exp$起業への焦りから投資詐欺で約10万円を失った。「簡単に成功できる方法があるんじゃないか」という期待があった。$exp$);

-- 第一志望に落選して大きく落ち込んだ
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['就活/落選', '挫折'], $exp$森岡毅に影響を受けP&G志望、落選して大きく落ち込んだ。$exp$);

-- 方向転換して、面接とインターンを50回以上受けた
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['就活/量をこなす', '切り替え'], $exp$方向転換し6月以降ほぼ毎日面接、面接とインターン合計50回以上、夏だけで20社前後。$exp$);

-- 就活を置いて中国へ渡航した
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['進路/寄り道', '恋愛'], $exp$中国人の彼女と出会い就活を置いて中国へ渡航。$exp$);

-- 数学をやっていない状態からデータサイエンスを習得した
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['学び直し', '未経験から'], $exp$データサイエンスに没頭しPython資格・統計検定2級・IBM Data Science Professional Certificateを約5ヶ月で取得。高校で数ⅡB・Ⅲをやっていない状態からの習得。$exp$);

-- 試験でほとんどコードが書けず「自分は何もできない」と感じた
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['実力不足', '自信喪失'], $exp$エンジニアを目指しSansanの試験を受けたがほとんどコードが書けず大敗、「自分は何もできない」という感覚を味わった。$exp$);

-- 内定を取った後、体調を崩して初めて立ち止まった
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['就活/内定', '立ち止まる'], $exp$11月に内定獲得、一旦は「ラッキー」と思った。しかし大阪インターン中に体調を崩して寝込み、その時間に初めて立ち止まった。$exp$);

-- 「なぜ就活してるんだろう」から休学を決め、反対を押し切った
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['休学/決断', '直感を優先'], $exp$「なぜ自分は就活してるんだろう」という問いが出て答えが出ず、就活停止と休学を決断。周囲にも人事にも反対されたが押し切った。合理性ではなく自分の感覚を優先した初めての瞬間。$exp$);

-- 目的より作ること自体に没頭した
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['没頭/集中', 'つくる'], $exp$休学後のテーマは「Just Do It」。Vibe CodingでAIアプリを2週間で6個制作、目的より作ること自体に没頭した。$exp$);

-- 孤独というテーマに出会い、高校の孤立と全部つながった
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['孤独/テーマ', '過去がつながる'], $exp$3月、中高生の孤独・自殺の記事をきっかけに孤独というテーマに出会い、高校時代の孤立と全部つながった。$exp$);

-- 「話したいのに話しかけられない人」に、かつての自分を見た
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['孤独/話しかけられない', '気づき'], $exp$IVS・TEAMZ・Sushi Tech・Takeoff Tokyo・TiB SPRINTなどイベントに大量参加。そこで一貫して見たのが「話したいのに話しかけられない人」で、中高の自分と重なった。$exp$);

-- 同じ闇を先に生きた人が届く仕組みを作っている
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['起業/構想', 'ビジョン'], $exp$現在Brainを構想・開発中。HELPボタンを押した瞬間に同じ闇を先に生きた人が届く仕組み。ビジョンは「裸で踊れる世界を創る」。$exp$);

-- ───────── 持論 ─────────

-- 経験から出てきた考え方。エピソードではないので1件にまとめてある
insert into experiences (account_id, tags, content)
values ('f30b4340-cb90-4316-b1fe-aed930c09897', array['持論'], $exp$・孤独とは一人でいることじゃない。「自分だけかもしれない」と思い込んでいる状態だ。
・自分だけだと思い込みやすい経験ほど、同じ経験をした人は意外と近くにいる。ただお互い言えないから見えないだけ。
・黒歴史はまだ接続されていない資産。誰かと繋がった瞬間に価値になる。
・感情には賞味期限がある。
・好きなことが嫌いになる経験は、それだけ本気だった証拠だ。
・あの頃欲しかったのは正しい答えでも完璧な励ましでもなく「自分もそうだった」という一言だった。
・苦手→できる→好きになる。この順番でいい。
・周囲の期待より自分の直感を優先した瞬間が、人生の転換点になる。
・経験に無駄なものは一つもない。
・ポジティブな人は言い換えの天才なだけ。$exp$);
