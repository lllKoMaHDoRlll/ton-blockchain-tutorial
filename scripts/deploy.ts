import { compile, NetworkProvider } from "@ton/blueprint";
import { MainContract } from "../wrappers/MainContract";
import { address, toNano } from "@ton/core";

export async function run(provider: NetworkProvider) {
    const myContract = MainContract.createFromConfig({
        number: 0,
        address: address("0QAjY1jXvJPujMFcUJ4TiNn_swbYWKhBQrvwJ-utt2Tzdxfm"),
        owner_address: address("0QAjY1jXvJPujMFcUJ4TiNn_swbYWKhBQrvwJ-utt2Tzdxfm"),
    }, await compile("MainContract"));

    const openedContract = provider.open(myContract);
    openedContract.sendDeploy(provider.sender(), toNano("0.05"));
    
    await provider.waitForDeploy(myContract.address);
}