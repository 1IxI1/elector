import {
    Builder,
    Cell,
    Dictionary,
    DictionaryValue,
    Slice,
    beginCell,
} from '@ton/core';

/*
  participant#_ stake:Grams   ;; submitted stake
                time:32       ;; time of stake submition
                max_factor:32
                src_addr:256
                adnl_addr:256
                  = Participant;

  elect#_ elect_at:uint32    ;; planned time of new set activation
          elect_close:uint32 ;; planned time of closing election for new application
          min_stake:Grams ;; minimal stake accepted
          total_stake:Grams ;; sum of all stakes accepted
          members:(HashmapE 256 Participant) ;; index - validator_pubkey
          failed:Bool
          finished:Bool
            = CurrentElection;

  validator#_ addr:uint256 ;; wallet address of validator
              weight:64                                              WHAAAAAAAAAAAAAAAAAAAAT
              stake:Grams  ;; accepted stake, can be lower than proposed
              banned:Bool  ;; currently unused flag
                = Validator;

  validator_complaint#bc validator_pubkey:uint256
                         description:^ComplaintDescr
                         created_at:uint32
                         severity:uint8
                         reward_addr:uint256
                         paid:Grams
                         suggested_fine:Grams
                         suggested_fine_part:uint32
                           = ValidatorComplaint;

  complaint_status#2d complaint:^ValidatorComplaint voters:(HashmapE 16 True)
                      vset_id:uint256 weight_remaining:int64 = ComplaintStatus;

  elect#_ unfreeze_at:uint32 ;; time validator stakes unfrozen and can be withdrawn
          stake_held:uint32  ;; period for holding stakes frozen, defined by ConfigParam 15
          vset_hash:bits256   ;; validator set cell hash
          frozen_dict:(HashmapE 256 Validator) ;; index validator_pubkey
          total_stake:Grams  ;; sum of accepted stakes of validators
          bonuses:Grams      ;; accumulated bonuses, distributed pro-rata
          complaints:(HashmapE 256 ComplaintStatus) ;; index complaint hash
          = PastElection;

  storage#_ elect:^CurrentElection
            credits:(HashmapE 256 Grams) ;; index address                                       HERE AdDED E TO HASHMAPE
            past_elections:(HashmapE 32 PastElection) ;; index elect_at
            grams:Grams ;; nobody balance
            active_id:uint32  ;; active election id
            active_hash:uint256 ;; hash of current cur_validators cell
            = Storage;
*/

type Validator = {
    // validator#_ addr:uint256 ;; wallet address of validator
    //             weight:uint64
    //             stake:Grams  ;; accepted stake, can be lower than proposed
    //             banned:Bool  ;; currently unused flag
    //               = Validator;
    addr: Buffer;
    weight: bigint;
    stake: bigint;
    banned: boolean;
};

type ValidatorComplaint = {
    // validator_complaint#bc validator_pubkey:uint256
    //                        description:^ComplaintDescr
    //                        created_at:uint32
    //                        severity:uint8
    //                        reward_addr:uint256
    //                        paid:Grams
    //                        suggested_fine:Grams
    //                        suggested_fine_part:uint32
    //                          = ValidatorComplaint;
    validator_pubkey: Buffer;
    description: Cell;
    created_at: number;
    severity: number;
    reward_addr: Buffer;
    paid: bigint;
    suggested_fine: bigint;
    suggested_fine_part: number;
};

type ComplaintStatus = {
    // complaint_status#2d complaint:^ValidatorComplaint voters:(HashmapE 16 True)
    //                     vset_id:uint256 weight_remaining:int64 = ComplaintStatus;
    complaint: ValidatorComplaint;
    voters: Dictionary<number, boolean>;
    vset_id: Buffer;
    weight_remaining: bigint;
};

type PastElection = {
    unfreeze_at: number;
    stake_held: number;
    vset_hash: Buffer;
    frozen_dict: Dictionary<Buffer, Validator>;
    total_stake: bigint;
    bonuses: bigint;
    complaints: Dictionary<Buffer, ComplaintStatus>;
};

const validatorValue: DictionaryValue<Validator> = {
    serialize: (src: Validator, builder: Builder) => {
        builder
            .storeBuffer(src.addr, 32)
            .storeUint(src.weight, 64)
            .storeCoins(src.stake)
            .storeBit(src.banned);
    },
    parse: (src: Slice) => {
        // validator#_ addr:uint256 ;; wallet address of validator
        //             weight:uint64
        //             stake:Grams  ;; accepted stake, can be lower than proposed
        //             banned:Bool  ;; currently unused flag
        //               = Validator;
        return {
            addr: src.loadBuffer(32),
            weight: src.loadUintBig(64),
            stake: src.loadCoins(),
            banned: src.loadBoolean(),
        };
    },
};

const complaintStatusValue: DictionaryValue<ComplaintStatus> = {
    // validator_complaint#bc validator_pubkey:uint256
    //                        description:^ComplaintDescr
    //                        created_at:uint32
    //                        severity:uint8
    //                        reward_addr:uint256
    //                        paid:Grams
    //                        suggested_fine:Grams
    //                        suggested_fine_part:uint32
    //                          = ValidatorComplaint;
    //
    // complaint_status#2d complaint:^ValidatorComplaint voters:(HashmapE 16 True)
    //                     vset_id:uint256 weight_remaining:int64 = ComplaintStatus;
    serialize: (src: ComplaintStatus, builder: Builder) => {
        const compliant = beginCell()
            .storeUint(0xbc, 8)
            .storeBuffer(src.complaint.validator_pubkey, 32)
            .storeRef(src.complaint.description)
            .storeUint(src.complaint.created_at, 32)
            .storeUint(src.complaint.severity, 8)
            .storeBuffer(src.complaint.reward_addr, 32)
            .storeCoins(src.complaint.paid)
            .storeCoins(src.complaint.suggested_fine)
            .storeUint(src.complaint.suggested_fine_part, 32)
            .endCell();

        builder
            .storeUint(0x2d, 8)
            .storeRef(compliant)
            .storeDict(
                src.voters,
                Dictionary.Keys.Uint(16),
                Dictionary.Values.Bool()
            )
            .storeBuffer(src.vset_id, 32)
            .storeInt(src.weight_remaining, 64);
    },
    parse: (src: Slice) => {
        src.loadUint(8);
        const comp = src.loadRef().beginParse();
        comp.loadUint(8);
        return {
            complaint: {
                validator_pubkey: comp.loadBuffer(32),
                description: comp.loadRef(),
                created_at: comp.loadUint(32),
                severity: comp.loadUint(8),
                reward_addr: comp.loadBuffer(32),
                paid: comp.loadCoins(),
                suggested_fine: comp.loadCoins(),
                suggested_fine_part: comp.loadUint(32),
            },
            voters: src.loadDict(
                Dictionary.Keys.Uint(16),
                Dictionary.Values.Bool()
            ),
            vset_id: src.loadBuffer(32),
            weight_remaining: src.loadUintBig(64),
        };
    },
};

const pastElectionValue: DictionaryValue<PastElection> = {
    serialize: (src: PastElection, builder: Builder) => {
        builder
            .storeUint(src.unfreeze_at, 32)
            .storeUint(src.stake_held, 32)
            .storeBuffer(src.vset_hash, 32)
            .storeDict(
                src.frozen_dict,
                Dictionary.Keys.Buffer(32),
                validatorValue
            )
            .storeCoins(src.total_stake)
            .storeCoins(src.bonuses)
            .storeDict(
                src.complaints,
                Dictionary.Keys.Buffer(32),
                complaintStatusValue
            );
    },
    parse: (src: Slice) => {
        // elect#_ unfreeze_at:uint32 ;; time validator stakes unfrozen and can be withdrawn
        //         stake_held:uint32  ;; period for holding stakes frozen, defined by ConfigParam 15
        //         vset_hash:bits256   ;; validator set cell hash
        //         frozen_dict:(HashmapE 256 Validator) ;; index validator_pubkey
        //         total_stake:Grams  ;; sum of accepted stakes of validators
        //         bonuses:Grams      ;; accumulated bonuses, distributed pro-rata
        //         complaints:(HashmapE 256 ComplaintStatus) ;; index complaint hash
        //         = PastElection;
        return {
            unfreeze_at: src.loadUint(32),
            stake_held: src.loadUint(32),
            vset_hash: src.loadBuffer(32),
            frozen_dict: src.loadDict(
                Dictionary.Keys.Buffer(32),
                validatorValue
            ),
            total_stake: src.loadCoins(),
            bonuses: src.loadCoins(),
            complaints: src.loadDict(
                Dictionary.Keys.Buffer(32),
                complaintStatusValue
            ),
        };
    },
};

type CurrentElection = {
    elect_at: number;
    elect_close: number;
    min_stake: bigint;
    total_stake: bigint;
    members: Dictionary<Buffer, Participant>;
    failed: boolean;
    finished: boolean;
};

export type ElectorStorage = {
    elect: CurrentElection | null;
    credits: Dictionary<Buffer, bigint>;
    past_elections: Dictionary<number, PastElection>;
    grams: bigint;
    active_id: number;
    active_hash: Buffer;
};

function parseStorage(s: Slice): ElectorStorage {
    // storage#_ elect:^CurrentElection
    //           credits:(HashmapE 256 Grams) ;; index address                                       HERE AdDED E TO HASHMAPE
    //           past_elections:(HashmapE 32 PastElection) ;; index elect_at
    //           grams:Grams ;; nobody balance
    //           active_id:uint32  ;; active election id
    //           active_hash:uint256 ;; hash of current cur_validators cell
    //           = Storage;
    console.log(s.remainingRefs);
    let elect: CurrentElection | null = null;
    let electCell = s.loadMaybeRef();
    if (electCell) {
        let es = electCell.beginParse();
        elect = {
            // elect#_ elect_at:uint32    ;; planned time of new set activation
            //         elect_close:uint32 ;; planned time of closing election for new application
            //         min_stake:Grams ;; minimal stake accepted
            //         total_stake:Grams ;; sum of all stakes accepted
            //         members:(HashmapE 256 Participant) ;; index - validator_pubkey
            //         failed:Bool
            //         finished:Bool
            //           = CurrentElection;
            elect_at: es.loadUint(32),
            elect_close: es.loadUint(32),
            min_stake: es.loadCoins(),
            total_stake: es.loadCoins(),
            members: es.loadDict(Dictionary.Keys.Buffer(32), participantValue),
            failed: es.loadBoolean(),
            finished: es.loadBoolean(),
        };
    }
    let credits = s.loadDict(
        Dictionary.Keys.Buffer(32),
        Dictionary.Values.BigVarUint(4)
    );
    let past_elections = s.loadDict(
        Dictionary.Keys.Uint(32),
        pastElectionValue
    );
    let grams = s.loadCoins();
    let active_id = s.loadUint(32);
    let active_hash = s.loadBuffer(32);
    return {
        elect,
        credits,
        past_elections,
        grams,
        active_id,
        active_hash,
    };
}

type Participant = {
    stake: bigint;
    time: number;
    max_factor: number;
    src_addr: Buffer;
    adnl_addr: Buffer;
};
const participantValue: DictionaryValue<Participant> = {
    serialize: (src: Participant, builder: Builder) => {
        builder
            .storeCoins(src.stake)
            .storeUint(src.time, 32)
            .storeUint(src.max_factor, 32)
            .storeBuffer(src.src_addr, 32)
            .storeBuffer(src.adnl_addr, 32);
    },
    parse: (src: Slice) => {
        const sc = src.loadRef().beginParse();
        return {
            stake: sc.loadCoins(),
            time: sc.loadUint(32),
            max_factor: sc.loadUint(32),
            src_addr: sc.loadBuffer(32),
            adnl_addr: sc.loadBuffer(32),
        };
    },
};

export async function loadElectorState(): Promise<ElectorStorage> {
    const url =
        'https://toncenter.com/api/v2/getAddressInformation?address=Ef8zMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzM0vF';
    const response = await fetch(url);
    const jsondata = await response.json();
    const data = jsondata.result.data;
    const c = Cell.fromBase64(data);
    const s = c.beginParse();
    const res = parseStorage(s);
    return res;
}
