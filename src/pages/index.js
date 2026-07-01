import { useEffect } from "react";
import Head from "@docusaurus/Head";

export default function Home() {
  useEffect(() => {
    window.location.replace("/getstarted/");
  }, []);

  return (
    <Head>
      <meta httpEquiv="refresh" content="0; url=/getstarted/" />
      <link rel="canonical" href="/getstarted/" />
    </Head>
  );
}
