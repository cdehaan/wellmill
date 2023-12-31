import { useState, useEffect, useCallback } from 'react';

type FetchType = 'customer' | 'product' | 'order' | 'products_list' | 'fake_customer' | 'fake_product' | 'fake_order' | 'fake_products_list';

const fakeProductData = [
  {
    id: "1",
    description: "選べる1項目モニタリング検査",
    long_description: "選べる1項目モニタリング検査は、2項目のお好きな検査項目を選んで検査することができるサービスです。管理医療機器承認のある採血キットを使用し、指先から少量の血液を採取します。採取した血液は、ポスト投函あるいは郵便局から郵送します。検査センターで血液を受け取ってから7営業日以内に検査を行います。結果は、マイページからご確認いただけます。",
    base_price: 6000,
    tax_rate: 0.10,
    images: ["https://cdn.shopify.com/s/files/1/0728/3933/2132/products/illust_1.png?v=1680808650", "https://cdn.shopify.com/s/files/1/0728/3933/2132/products/Clippathgroup.png?v=1680808650", "https://cdn.shopify.com/s/files/1/0728/3933/2132/products/img_1.jpg?v=1680808650"],
    bloodTest: true,
  },{
    id: "2",
    description: "選べる2項目モニタリング検査",
    long_description: "選べる2項目モニタリング検査は、2項目のお好きな検査項目を選んで検査することができるサービスです。管理医療機器承認のある採血キットを使用し、指先から少量の血液を採取します。採取した血液は、ポスト投函あるいは郵便局から郵送します。検査センターで血液を受け取ってから7営業日以内に検査を行います。結果は、マイページからご確認いただけます。",
    base_price: 9000,
    tax_rate: 0.10,
    images: ["https://cdn.shopify.com/s/files/1/0728/3933/2132/products/illust_2.png?v=1680808708", "https://cdn.shopify.com/s/files/1/0728/3933/2132/products/Clippathgroup.png?v=1680808650", "https://cdn.shopify.com/s/files/1/0728/3933/2132/products/img_1.jpg?v=1680808650"],
    bloodTest: true,
  },{
    id: "3",
    description: "選べる3項目モニタリング検査",
    long_description: "選べる3項目モニタリング検査は、2項目のお好きな検査項目を選んで検査することができるサービスです。管理医療機器承認のある採血キットを使用し、指先から少量の血液を採取します。採取した血液は、ポスト投函あるいは郵便局から郵送します。検査センターで血液を受け取ってから7営業日以内に検査を行います。結果は、マイページからご確認いただけます。",
    base_price: 12000,
    tax_rate: 0.10,
    images: ["https://cdn.shopify.com/s/files/1/0728/3933/2132/products/illust_3.png?v=1680808736", "https://cdn.shopify.com/s/files/1/0728/3933/2132/products/Clippathgroup.png?v=1680808650", "https://cdn.shopify.com/s/files/1/0728/3933/2132/products/img_1.jpg?v=1680808650"],
    bloodTest: true,
  }
]

function useWPData(type: FetchType, id?: number) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | string | null>(null);

  const BASE_URL = 'https://www.well-mill.com/wp-json/wp/v2/';

  const fetchData = useCallback(async () => {
    if(type === 'fake_products_list') {
      console.log("Setting data in useWPData:", fakeProductData);
      setData(fakeProductData);
      return fakeProductData;
    }

    let endpoint: string;

    switch (type) {
      case 'customer':
        endpoint = `customers/${id}`;
        break;
      case 'product':
        endpoint = id ? `products/${id}` : 'products';
        break;
      case 'order':
        endpoint = `orders/${id}`;
        break;
      case 'products_list':
        endpoint = 'products';
        break;
      default:
        throw new Error('Invalid fetch type');
    }

    setLoading(true);

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`);

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  }, [type, setData, id]);

  useEffect(() => {
    if (id || type === 'products_list') {
      fetchData();
    }
    if(type === 'fake_products_list') {
        setData(fakeProductData)
    }
  }, [type, id, fetchData]);

  return [data, loading, error, fetchData];
}

export default useWPData;