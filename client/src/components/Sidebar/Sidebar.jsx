import {
  Card,
  Typography,
  List,
  ListItem,
  ListItemPrefix,
  ListItemSuffix,
  Chip,
  Accordion,
  AccordionHeader,
  AccordionBody,
} from "@material-tailwind/react";
import {
  HomeIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  PowerIcon,
  UserCircleIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/solid";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../utils/useAuth';
import React from "react";

export default function Sidebar() {
  const [open, setOpen] = React.useState(0);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleOpen = (value) => {
    setOpen(open === value ? 0 : value);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isAdminOrDirector = user?.role === 'admin' || user?.position === 'Giam doc' || user?.position === 'Pho Giam doc';

  return (
    <Card className="h-[calc(100vh-2rem)] w-full max-w-[20rem] p-4 shadow-xl shadow-blue-gray-900/5 font-sans">
      <div className="mb-2 p-4">
        <Typography variant="h5" color="blue-gray" className="font-bold text-lg">
          Danh mục
        </Typography>
      </div>
      <List className="gap-2">
        <ListItem onClick={() => navigate('/')}>
          <ListItemPrefix>
            <HomeIcon className="h-5 w-5" />
          </ListItemPrefix>
          Trang chủ
        </ListItem>

        <Accordion
          open={open === 1}
          icon={
            <ChevronDownIcon
              strokeWidth={2.5}
              className={`mx-auto h-4 w-4 transition-transform ${open === 1 ? "rotate-180" : ""}`}
            />
          }
        >
          <ListItem className="p-0" selected={open === 1}>
            <AccordionHeader onClick={() => handleOpen(1)} className="border-b-0 p-3">
              <ListItemPrefix>
                <ClipboardDocumentListIcon className="h-5 w-5" />
              </ListItemPrefix>
              <Typography color="blue-gray" className="mr-auto font-normal">
                Quản lý
              </Typography>
            </AccordionHeader>
          </ListItem>
          <AccordionBody className="py-1">
            <List className="p-0">
              <ListItem onClick={() => navigate('/indicators')}>
                <ListItemPrefix>
                  <ChartBarIcon className="h-5 w-5" />
                </ListItemPrefix>
                Quản lý chỉ tiêu
              </ListItem>
              <ListItem onClick={() => navigate('/tasks')}>
                <ListItemPrefix>
                  <ClipboardDocumentListIcon className="h-5 w-5" />
                </ListItemPrefix>
                Quản lý nhiệm vụ
              </ListItem>
              <ListItem onClick={() => navigate('/manage-users')}>
                <ListItemPrefix>
                  <UsersIcon className="h-5 w-5" />
                </ListItemPrefix>
                Quản lý người dùng
              </ListItem>
              {isAdminOrDirector && (
                <ListItem onClick={() => navigate('/overdue-tasks')}>
                  <ListItemPrefix>
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                  </ListItemPrefix>
                  <Typography color="red" className="font-medium">
                    Nhiệm vụ quá deadline
                  </Typography>
                </ListItem>
              )}
            </List>
          </AccordionBody>
        </Accordion>

        <hr className="my-2 border-blue-gray-50" />

        <ListItem onClick={() => navigate('/me')}>
          <ListItemPrefix>
            <UserCircleIcon className="h-5 w-5" />
          </ListItemPrefix>
          Thông tin người dùng
        </ListItem>
        <ListItem onClick={handleLogout}>
          <ListItemPrefix>
            <PowerIcon className="h-5 w-5" />
          </ListItemPrefix>
          Đăng xuất
        </ListItem>
      </List>
    </Card>
  );
}