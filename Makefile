up:
	docker-compose up -d
exec:
	docker-compose exec app bash
down:
	docker-compose down
log:
	docker-compose logs --follow app
clear:
	rm -rf "output.json" "cookies.json" "tmp/*"
