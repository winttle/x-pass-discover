import type { DepartmentText, Translations } from './localize';

/** The five departments in other languages, by slug. See `localize.ts`. */
export const DEPARTMENT_TRANSLATIONS: Translations<Record<string, DepartmentText>> = {
  ja: {
    marketing: {
      name: 'マーケティング',
      tagline: 'どう売り出すか？',
      description:
        'Spicy Crispy Chicken Bites の発売を計画します。誰に向けた商品か、どう届けるか、成功をどう測るかを決めます。',
      projectTitle: 'Spicy Crispy Chicken Bites 発売',
      coreQuestion: 'どう売り出すか？',
      finalOutput: 'マーケティング引き継ぎメモ',
    },
    sales: {
      name: '営業',
      tagline: 'どう取引を勝ち取るか？',
      description:
        'BITE Protein Drink を、採算の取れる条件で QuickMart に採用してもらいます。取引先を調べ、バイヤーに会い、取引条件を設計し、交渉します。',
      projectTitle: 'BITE Protein Drink × QuickMart',
      coreQuestion: 'どう取引を勝ち取るか？',
      finalOutput: 'QuickMart 営業提案書',
    },
    'product-management': {
      name: 'プロダクトマネジメント',
      tagline: '何をつくるべきか？',
      description:
        '製品ではなく顧客の課題から出発し、BITE が春の季節メニューに何を載せるべきかを決めます。',
      projectTitle: '春の季節メニュー企画',
      coreQuestion: '何をつくるべきか？',
      finalOutput: '商品企画 意思決定ブリーフ',
    },
    strategy: {
      name: '経営戦略',
      tagline: 'BITE はどこで成長すべきか？',
      description:
        '担当製品のない全社レベルの成長プロジェクトです。2027年までに成長するため、BITE がどこに投資すべきかを決めます。',
      projectTitle: 'BITE 2027 成長戦略',
      coreQuestion: 'BITE はどこで成長すべきか？',
      finalOutput: '戦略意思決定レポート',
    },
    'human-resources': {
      name: '人事',
      tagline: '誰を採用すべきか？',
      description:
        'BITE Protein Drink の中国展開に向けて不足している能力を見極め、職務に即した基準を定め、候補者を面接し、採用すべき人を推薦します。',
      projectTitle: 'BITE Protein Drink × 中国展開の人材採用',
      coreQuestion: '誰を採用すべきか？',
      finalOutput: '最終採用推薦',
    },
  },
};
