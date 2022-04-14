# This target will reset the network
start-cronos-devnet: install-pystarport download-cronosd
	@cd cronos_devnet && pystarport serve --config ./config.yaml

resume-devnet: download-cronosd
	@./cronos_devnet/bin/cronosd --home ./cronos_devnet/data/cronosdevnet_796-1/node0 start

# https://crypto.org/docs/getting-started/local-devnet.html#pre-requisites
install-pystarport:
	@echo "Install pystarport"
	@pip3 install pystarport

download-cronosd:
ifeq (,$(wildcard ./cronos_devnet/bin/cronosd))
	@echo "Download cronosd" 
	@curl -L https://github.com/crypto-org-chain/cronos/releases/download/v0.6.5/cronos_0.6.5-testnet_Darwin_x86_64.tar.gz --output cronosd.tar.gz
	@tar -xvf cronosd.tar.gz -C ./cronos_devnet bin/cronosd
	@rm cronosd.tar.gz
else
	@echo "cronosd exists"
endif

deploy-rpg:
	@npx hardhat run --network cronos scripts/deploy.js