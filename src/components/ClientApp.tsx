"use client";

import dynamic from "next/dynamic";

// The app keeps its state in the browser (localStorage), so it renders on the client only.
const App = dynamic(() => import("./App"), {
  ssr: false,
  loading: () => <div className="flex-1" />,
});

export default function ClientApp() {
  return <App />;
}
