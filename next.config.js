/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['imapflow', 'nodemailer', 'mailparser', 'bcryptjs'],
  },
};

module.exports = nextConfig;