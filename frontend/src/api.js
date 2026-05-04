import axios from 'axios';

const BASE = 'http://localhost:5000/api';

export const login         = (email)   => axios.post(`${BASE}/login`, { email });
export const getRequests   = ()        => axios.get(`${BASE}/requests`);
export const createRequest = (data)    => axios.post(`${BASE}/requests`, data);
export const approveReq    = (id)      => axios.patch(`${BASE}/requests/${id}/approve`);
export const rejectReq     = (id)      => axios.patch(`${BASE}/requests/${id}/reject`);
export const getInventory  = (unit_id) => axios.get(`${BASE}/inventory`, { params: { unit_id } });
export const getExpiring   = ()        => axios.get(`${BASE}/inventory/expiring`);
export const getCarbon     = ()        => axios.get(`${BASE}/carbon`);
export const getUnits = () => axios.get(`${BASE}/requests/units`);
export const getItems = () => axios.get(`${BASE}/requests/items`);