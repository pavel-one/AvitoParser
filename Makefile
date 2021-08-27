up:
	docker-compose up -d
exec:
	docker-compose exec app bash
down:
	docker-compose down
clear:
	rm -rf "output.json" "cookies.json" "tmp/*"
