export interface CurrentUserI {
  sub: string;
  username: string;
  role: string;
  name: string;
  allowedFloorIds: string[];
  iat?: number;
  exp?: number;
}
