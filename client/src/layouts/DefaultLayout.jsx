import Header from "../components/Header/Header.component";
import Footer from "../components/Footer/Footer.component";

function DefaultLayout({ children, headerProps }) {
  return (
    <div>
      <Header {...headerProps} />
      {children}
      <Footer />
    </div>
  );
}
export default DefaultLayout;
