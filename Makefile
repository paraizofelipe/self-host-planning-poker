REGISTRY=container-registry.br-se1.magalu.cloud/pmr/self-poker
VERSION?=1.0.0

.PHONY: publish

publish:
	docker buildx build --no-cache --platform linux/amd64 . \
		-t $(REGISTRY):$(VERSION) \
		--push
