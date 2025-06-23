import React from "react";
import Header from"../components/HeaderFooter/Header.component";
import Footer from"../components/HeaderFooter/Footer.component";

interface Props {
  children: React.ReactNode
}
function Layout({ children }: Props) {
  return (
      <div>
          <Header />
          {children}
          <Footer />
      </div>
  );
}

export default Layout;