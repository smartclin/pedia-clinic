{pkgs}: {
  channel = "stable-24.05";
  packages = [
    pkgs.nodejs_22
    pkgs.bun
    pkgs.openssl
  ];
  services.postgres = {
    enable = true;
    enableTcp = true;
    extensions = [ "pgvector" "postgis" ];
    package = pkgs.postgresql_15;
  };
  idx.extensions = [
    
  ];
  idx.previews = {
    previews = {
      web = {
        command = [
          "npm"
          "run"
          "dev"
          "--"
          "--port"
          "$PORT"
          "--hostname"
          "0.0.0.0"
        ];
        manager = "web";
      };
    };
  };
}
