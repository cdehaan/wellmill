import React from 'react';
import { Helmet } from 'react-helmet';

const GTMHead = () => {
  const gtmId = 'GTM-K5BM892';

  return (
    <Helmet>
      <script>
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${gtmId}');`}
      </script>
      <meta
        http-equiv="Content-Security-Policy"
        content={`
          default-src 'self' https://zipcloud.ibsnet.co.jp https://*.google.com https://googleads.g.doubleclick.net https://*.well-mill.com; 
          script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.googletagmanager.com https://to.reprocell.co.jp https://*.clarity.ms https://connect.facebook.net https://*.google-analytics.com https://*.google.com/pagead https://googleads.g.doubleclick.net https://*.facebook.com https://*.google.com/pagead https://*.googleadservices.com;
          style-src 'self' 'unsafe-inline'; 
          frame-src https://js.stripe.com; 
          connect-src 'self' https://zipcloud.ibsnet.co.jp https://*.googletagmanager.com https://*.google-analytics.com https://*.clarity.ms https://*.well-mill.com;
          img-src 'self' https://*.google.com https://*.clarity.ms; https://googleads.g.doubleclick.net https://www.facebook.com;
          `}
        />
    </Helmet>
  );
};

export default GTMHead;
