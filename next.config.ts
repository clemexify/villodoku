import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Permet d'accéder au serveur de dev depuis le téléphone sur le même réseau local
  allowedDevOrigins: ["192.168.1.41"],
};

export default nextConfig;
