import Footer from "../components/Footer/Footer.component";

function DefaultLayout({ children }) {
  return (
    <div>
      {children}
      <Footer />
    </div>
  );
}
export default DefaultLayout;
