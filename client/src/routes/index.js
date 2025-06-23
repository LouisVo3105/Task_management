import DefaultLayout from "../layouts/DefaultLayout";
import LandingPage from "../pages/LandingPage/LandingPage";

const routes =[
  {
    path: '/',
    page: LandingPage,
    layout: DefaultLayout,
    protectedRole: null,
},

];

export default routes