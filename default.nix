let
  # Configure Nix to allow unfree packages.
  config = {
    allowUnfree = true;
  };
  pkgs = import <nixpkgs> { inherit config; };
in
pkgs.mkShell {
  packages = with pkgs; [
    corepack
    ngrok # Unfree package.
    jq
  ];
}
