/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import DevoteeRegistration from "./pages/DevoteeRegistration";
import BhuvajiDashboard from "./pages/BhuvajiDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import TempleScreen from "./pages/TempleScreen";
import Login from "./pages/Login";
import Layout from "./components/Layout";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<DevoteeRegistration />} />
          <Route path="register" element={<DevoteeRegistration />} />
          <Route path="ragister" element={<DevoteeRegistration />} />
          <Route path="events" element={<DevoteeRegistration />} />
          <Route path="gallery" element={<DevoteeRegistration />} />
          <Route path="temple" element={<TempleScreen />} />
          <Route path="temple/live" element={<TempleScreen />} />
          <Route path="login" element={<Login />} />
          <Route path="bhuvaji" element={<BhuvajiDashboard />} />
          <Route path="admin" element={<AdminDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
