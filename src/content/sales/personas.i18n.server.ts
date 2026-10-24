import 'server-only';
import type { PersonaText } from '@/content/personas.server';
import type { Translations } from '@/content/localize';

/**
 * SERVER-ONLY: the client-facing parts of the Sales personas in other
 * languages. Server-only because it carries the labels of facts the student
 * has not uncovered yet — a label is sent only once its fact is earned.
 *
 * Names are left as written: the office signs them in English too, and a
 * person keeps one name across the app. System prompts are not translated;
 * the personas already answer in the language the student writes in.
 */
export const SALES_PERSONA_TRANSLATIONS: Translations<Record<string, PersonaText>> = {
  ja: {
    'quickmart-buyer': {
      role: '飲料カテゴリーバイヤー',
      visibleContext:
        'Yuki Tanaka さんが責任を負うのは、特定のサプライヤーではなく、QuickMart の飲料棚全体の収益性です。棚スペースには限りがあるため、BITE を加えるには、おそらく何か別の商品を外すことになります。',
      openingMessage:
        'お越しいただきありがとうございます。率直に申し上げます。当社ではすでにプロテインドリンクを何種類も扱っていて、冷蔵棚はいっぱいです。BITE を入れるとなると、おそらく別の商品を外すことになります。ですから、なぜ BITE にその棚を任せるべきなのか、説明していただけますか。',
      factLabels: {
        morning_velocity: '朝の販売ペース',
        price_conversion: '価格と購入率',
        shelf_space: '棚スペース / フェイス数',
        new_product_waste: '新商品の廃棄リスク',
        pilot_preference: '希望するパイロット構成',
        expansion_threshold: '拡大の基準',
      },
    },
    'bite-sales-manager': {
      role: '流通営業マネージャー',
      visibleContext:
        'BITE 流通営業チームでのあなたのマネージャーです。ミッションを割り当て、BITE の制約について説明してくれますが、取引先の攻略は自分でやることを期待しています。',
      openingMessage:
        'ちょうどいいところに来たね。あなたに担当してほしいのは QuickMart。約 1,200 店舗あって、健康飲料を積極的に伸ばそうとしている。ミッションは、BITE Protein Drink を、うちが本当に受け入れられる条件で採用してもらうこと。BITE のことは何でも聞いて。でも QuickMart のことは、あなたが自分で突き止めること。',
      factLabels: {
        bite_production_capacity: '初期の生産能力',
      },
    },
  },
};
