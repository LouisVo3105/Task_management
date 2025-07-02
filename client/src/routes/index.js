import DefaultLayout from "../layouts/DefaultLayout";
import UserLayout from "../layouts/UserLayout";
import DefaultPage from "../pages/DefaultPage/DefaultPage";
import UserInfo from "../pages/UserInfor/UserInfoPage";
import IndicatorPage from "../pages/IndicatorPage/IndicatorPage";
import ManageUser from "../pages/ManageUser/ManageUser..jsx";
import TaskPage from "../pages/TaskPage/TaskPage";
import TaskDetailPage from "../pages/TaskPage/TaskDetailPage";
import PendingTaskDetailPage from "../pages/TaskPage/PendingTaskDetailPage";
import SubmitMainTaskPage from "../pages/TaskPage/SubmitMainTaskPage";
import HomePage from "../pages/HomePage/HomePage";

const routes = [
  {
    path: '/',
    page: HomePage,
    layout: UserLayout,
    protectedRole: null,
  },
  {
    path: '/indicators',
    page: IndicatorPage,
    layout: UserLayout,
    protectedRole: null,
  },
  {
    path: '/tasks',
    page: TaskPage,
    layout: UserLayout,
    protectedRole: null,
  },
  {
    path: '/tasks/:taskId',
    page: TaskDetailPage,
    layout: UserLayout,
    protectedRole: null,
  },
  {
    path: '/pending-tasks/:taskId',
    page: PendingTaskDetailPage,
    layout: UserLayout,
    protectedRole: null,
  },
  {
    path: '/me',
    page: UserInfo,
    layout: UserLayout,
    protectedRole: null,
  },
  {
    path: '/manage-users',
    page: ManageUser,
    layout: UserLayout,
    protectedRole: null,
  },
  {
    path: '/tasks/:taskId/submit',
    page: SubmitMainTaskPage,
    layout: UserLayout,
    protectedRole: null,
  },
];

export default routes;