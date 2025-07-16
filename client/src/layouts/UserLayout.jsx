import Footer from "../components/Footer/Footer.component";
import Sidebar from "../components/Sidebar/Sidebar";

function UserLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1">{children}</main>
      </div>
      <Footer />
    </div>
  );
}
export default UserLayout;
