const backendOrigin = (process.env.RENDER_BACKEND_ORIGIN || "").replace(/\/+$/, "");

export const config = {
  rewrites: backendOrigin
    ? [
        {
          source: "/api/(.*)",
          destination: `${backendOrigin}/api/$1`
        }
      ]
    : []
};
