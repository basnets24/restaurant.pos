// src/auth/ApiAuthorizationConstants.ts
export const ApplicationName = 'RestaurantPos';

export const QueryParameterNames = {
    ReturnUrl: 'returnUrl',
    Message: 'message',
} as const;

export const LogoutActions = {
    LogoutCallback: 'logout-callback',
    Logout: 'logout',
    LoggedOut: 'logged-out',
} as const;

export const LoginActions = {
    Login: 'login',
    LoginCallback: 'login-callback',
    LoginFailed: 'login-failed',
    Profile: 'profile',
    Register: 'register',
} as const;

const prefix = '/authentication';

export const AuthorizationPaths = {
    DefaultLoginRedirectPath: '/home',
    ApiAuthorizationPrefix: prefix,
    Login: `${prefix}/${LoginActions.Login}`,
    LoginFailed: `${prefix}/${LoginActions.LoginFailed}`,
    LoginCallback: `${prefix}/${LoginActions.LoginCallback}`,
    Register: `${prefix}/${LoginActions.Register}`,
    Profile: `${prefix}/${LoginActions.Profile}`,
    LogOut: `${prefix}/${LogoutActions.Logout}`,
    LoggedOut: `${prefix}/${LogoutActions.LoggedOut}`,
    LogOutCallback: `${prefix}/${LogoutActions.LogoutCallback}`,
    IdentityRegisterPath: '/Identity/Account/Register',
    IdentityManagePath: '/Identity/Account/Manage',
} as const;
