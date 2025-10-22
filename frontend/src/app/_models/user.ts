export interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  roles?: string[];
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenExpiresAt?: number;
  password?: string;
}