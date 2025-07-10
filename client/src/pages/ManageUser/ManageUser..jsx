import React from 'react';
import { useManageUserLogic } from './ManageUser.logic';
import ManageUserUI from './ManageUserUI';

function ManageUser() {
  const logic = useManageUserLogic();
  return <ManageUserUI {...logic} />;
}

export default ManageUser;
