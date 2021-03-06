import { BlocktapClient } from "../lib";
import { CandlePeriod } from "../lib/types/CandlePeriod";
import { MarketStatus } from "../lib/types/MarketStatus";
import { MarketType } from "../lib/types/MarketType";
import { OptionType } from "../lib/types/OptionType";
import { RequestError } from "../lib";
import { expect } from "chai";

function expectReject(promise: Promise<any>, done: Mocha.Done) {
	promise.then(() => done(new Error("Expected rejection"))).catch(() => done());
}

const fixtures: any = {};

fixtures.basicQuery = `
query price {
	market(id: "binance_btc_usdt") {
		id
	}
}`;

fixtures.restrictedData = `
query price {
	market(id: "binance_btc_usdt") {
		id
    ohlcv(resolution:_1m limit:5)
	}
}`;

fixtures.badQuery = `
query price {
	market {}
}`;

function wait(timeout = 250) {
	return new Promise(resolve => setTimeout(resolve, timeout));
}

describe("BlocktapClient", () => {
	afterEach(async () => {
		await wait();
	});
	describe("not authenticated", () => {
		describe(".query()", () => {
			it("should return results of valid query", async () => {
				const sut = new BlocktapClient();
				const result = await sut.query({ query: fixtures.basicQuery });
				expect(result.data.market.id).to.equal("binance_btc_usdt");
			});

			it("should return results of bad query", async () => {
				const sut = new BlocktapClient();
				const result = await sut.query({ query: fixtures.badQuery });
				expect(result.errors.length).to.be.greaterThan(0);
			});

			it("should reject on invalid request", () => {
				const sut = new BlocktapClient(undefined, "https://api.blocktap.io/graphqll");
				return sut
					.query({ query: fixtures.basicQuery })
					.then(() => {
						throw new Error("Should not succeed");
					})
					.catch(err => {
						expect(err).to.be.an.instanceOf(RequestError);
					});
			});

			it("should return null for restricted data", async () => {
				const sut = new BlocktapClient();
				const result = await sut.query({ query: fixtures.restrictedData });
				expect(result.data.market.ohlcv).to.be.null;
			});
		});
	});
	describe("authenticated", () => {
		let sut: BlocktapClient;
		before(function() {
			if (!process.env.BLOCKTAP_KEY) {
				this.skip();
			}
			sut = new BlocktapClient(process.env.BLOCKTAP_KEY);
		});
		describe(".query()", () => {
			it("should return restricted data", async () => {
				const result = await sut.query({ query: fixtures.restrictedData });
				expect(result.data.market.ohlcv).to.not.be.null;
			});
		});

		describe(".currencies()", () => {
			it("returns currencies", async () => {
				const result = await sut.currencies({ currencySymbol: "BTC" });
				expect(result[0].currencySymbol).to.equal("BTC");
				expect(result[0].currencyName).to.equal("Bitcoin");
				expect(result[0].isActive).to.equal(true);
			});

			it("returns currencies filtered by symbol", async () => {
				const result = await sut.currencies({ currencySymbol: "BT%" });
				expect(result.length).be.gt(0);
			});

			it("returns currencies filtered by symbol", async () => {
				const result = await sut.currencies({ currencyName: "Bit%" });
				expect(result.length).be.gt(0);
			});

			it("returns currencies filtered by isActive", async () => {
				const result = await sut.currencies({ isActive: false });
				expect(result.length).be.gt(0);
			});
		});

		describe(".exchanges()", () => {
			it("returns exchanges", async () => {
				const result = await sut.exchanges();
				const binance = result.find(p => p.exchangeSymbol === "Binance");
				expect(binance.exchangeSymbol).to.equal("Binance");
				expect(binance.exchangeName).to.equal("Binance");
				expect(binance.isActive).to.equal(true);
			});
		});

		describe(".markets()", () => {
			it("no filters", async () => {
				const result = await sut.markets();
				expect(result.length).to.be.gt(0);
				expect(result[0].id).to.be.a("string");
				expect(result[0].marketSymbol).to.be.a("string");
				expect(result[0].marketType).to.be.a("string");
				expect(result[0].marketStatus).to.be.a("string");
				expect(result[0].exchangeSymbol).to.be.a("string");
				expect(result[0].baseSymbol).to.be.a("string");
				expect(result[0].quoteSymbol).to.be.a("string");
				expect(result[0].remoteId).to.be.a("string");
			}).timeout(10000);

			it("exchange filter", async () => {
				const result = await sut.markets({ exchangeSymbol: "CoinbasePro" });
				expect(result.every(p => p.exchangeSymbol === "CoinbasePro")).to.equal(true);
			}).timeout(10000);

			it("base filter", async () => {
				const result = await sut.markets({ baseSymbol: "BTC" });
				expect(result.every(p => p.baseSymbol === "BTC")).to.equal(true);
			}).timeout(10000);

			it("quote filter", async () => {
				const result = await sut.markets({ quoteSymbol: "BTC" });
				expect(result.every(p => p.quoteSymbol === "BTC")).to.equal(true);
			}).timeout(10000);

			it("status filter", async () => {
				const result = await sut.markets({ marketStatus: MarketStatus.Active });
				expect(result.every(p => p.marketStatus === MarketStatus.Active)).to.equal(true);
			}).timeout(10000);

			it("futures filter", async () => {
				const result = await sut.markets({
					marketStatus: MarketStatus.Active,
					marketType: MarketType.Futures,
				});
				expect(result.every(p => p.marketType === MarketType.Futures)).to.equal(true);
			}).timeout(10000);

			it("swap filter", async () => {
				const result = await sut.markets({
					marketStatus: MarketStatus.Active,
					marketType: MarketType.Swap,
				});
				expect(result.every(p => p.marketType === MarketType.Swap)).to.equal(true);
			}).timeout(10000);

			it("option filter", async () => {
				const result = await sut.markets({
					marketStatus: MarketStatus.Active,
					marketType: MarketType.Option,
				});
				expect(result.every(p => p.marketType === MarketType.Option)).to.equal(true);
			}).timeout(10000);

			it("call option", async () => {
				const result = await sut.markets({
					marketStatus: MarketStatus.Active,
					marketType: MarketType.Option,
					optionType: OptionType.Call,
				});
				expect(result.every(p => p.optionType === OptionType.Call)).to.equal(true);
			}).timeout(10000);

			it("put option", async () => {
				const result = await sut.markets({
					marketStatus: MarketStatus.Active,
					marketType: MarketType.Option,
					optionType: OptionType.Put,
				});
				expect(result.every(p => p.optionType === OptionType.Put)).to.equal(true);
			}).timeout(10000);
		});

		describe(".market()", () => {
			it("when exists", async () => {
				const result = await sut.market("coinbasepro_btc_usd");
				expect(result.id).to.equal("coinbasepro_btc_usd");
				expect(result.marketSymbol).to.equal("CoinbasePro:BTC/USD");
				expect(result.marketType).to.equal("Spot");
				expect(result.marketStatus).to.equal("Active");
				expect(result.exchangeSymbol).to.equal("CoinbasePro");
				expect(result.baseSymbol).to.equal("BTC");
				expect(result.quoteSymbol).to.equal("USD");
				expect(result.remoteId).to.equal("BTC-USD");
			});

			it("with option data", async () => {
				const result = await sut.market("ledgerx_btc_usd_20925827");
				expect(result.expiryDate).to.equal("2020-12-18");
				expect(result.optionType).to.equal("Call");
				expect(result.optionStrike).to.equal("5000.00000000");
			});

			it("when doesn't exist", done => {
				expectReject(sut.market("coinbaser_btc_usd"), done);
			});
		});

		describe(".candles()", () => {
			it("when valid returns candles", async () => {
				const result = await sut.candles(
					"coinbasepro_btc_usd",
					"2020-01-01T00:00:00.000Z",
					"2020-01-02T00:00:00.000Z",
					CandlePeriod._1h
				);
				expect(result.length).to.equal(24);
				expect(result[0][0]).to.equal("1577836800");
				expect(result[0][1]).to.equal("7165.72000000");
				expect(result[0][2]).to.equal("7165.72000000");
				expect(result[0][3]).to.equal("7136.05000000");
				expect(result[0][4]).to.equal("7150.35000000");
				expect(result[0][5]).to.equal("250.84981195");
			});

			it("when invalid market throws error", done => {
				expectReject(
					sut.candles(
						"coinbaser_btc_usd",
						"2020-01-01T00:00:00.000Z",
						"2020-01-02T00:00:00.000Z",
						CandlePeriod._1h
					),
					done
				);
			});

			it("when invalid start throws error", done => {
				expectReject(
					sut.candles(
						"coinbasepro_btc_usd",
						"2020-01-01",
						"2020-01-02T00:00:00.000Z",
						CandlePeriod._1h
					),
					done
				);
			});

			it("when invalid end throws error", done => {
				expectReject(
					sut.candles(
						"coinbasepro_btc_usd",
						"2020-01-01T00:00:00.000Z",
						"2020-01-02",
						CandlePeriod._1h
					),
					done
				);
			});

			it("when invalid period throws error", done => {
				expectReject(
					sut.candles(
						"coinbasepro_btc_usd",
						"2020-01-01T00:00:00.000Z",
						"2020-01-02T00:00:00.000Z",
						"_1s" as any
					),
					done
				);
			});
		});

		describe(".trades()", () => {
			it("when valid returns trades", async () => {
				const result = await sut.trades(
					"coinbasepro_btc_usd",
					"2020-01-01T00:00:00.000Z",
					"2020-01-01T00:01:00.000Z"
				);
				expect(result.length).to.equal(41);
				expect(result[0].id).to.equal("80350317");
				expect(result[0].unix).to.equal(1577836800222);
				expect(result[0].side).to.equal("Ask");
				expect(result[0].price).to.equal("7165.72000000");
				expect(result[0].amount).to.equal("0.01392747");
			});

			it("when invalid market throws error", done => {
				expectReject(
					sut.trades(
						"coinbaser_btc_usd",
						"2020-01-01T00:00:00.000Z",
						"2020-01-01T00:01:00.000Z"
					),
					done
				);
			});

			it("when invalid start throws error", done => {
				expectReject(
					sut.trades("coinbasepro_btc_usd", "2020-01-01", "2020-01-01T00:01:00.000Z"),
					done
				);
			});

			it("when invalid end throws error", done => {
				expectReject(
					sut.trades("coinbasepro_btc_usd", "2020-01-01T00:00:00.000Z", "2020-01-01"),
					done
				);
			});
		});
	});
});
