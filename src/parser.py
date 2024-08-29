import requests
import base64
import typing
from enum import Enum
from pytoniq_core import Slice, TlbScheme, Cell, Builder, Slice, HashMap, Address


### a set of constructors used in elector
'''
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
              weight:64
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
          vset_hash:uint32   ;; validator set cell hash
          frozen_dict:(HashmapE 256 Validator) ;; index validator_pubkey
          total_stake:Grams  ;; sum of accepted stakes of validators
          bonuses:Grams      ;; accumulated bonuses, distributed pro-rata
          complaints:(HashmapE 256 ComplaintStatus) ;; index complaint hash
          = PastElection;

  storage#_ elect:CurrentElection
            credits:(Hashmap 256 Grams) ;; index address
            past_elections:(HashmapE 32 PastElection) ;; index elect_at
            grams:Grams ;; nobody balance
            active_id:uint32  ;; active election id
            active_hash:uint256 ;; hash of current cur_validators cell
            = Storage;
'''

class Participant(TlbScheme):
    """
    participant#_ stake:Grams   ;; submitted stake
                  time:32       ;; time of stake submition
                  max_factor:32
                  src_addr:256
                  adnl_addr:256
                    = Participant;
    """
    def __init__(self,
                 stake: typing.Optional[int] = 0,
                 time: typing.Optional[int] = 0,
                 max_factor: typing.Optional[int] = 0,
                 src_addr: typing.Optional[int] = 0,
                 adnl_addr: typing.Optional[int] = 0
                 ):
        self.stake = stake
        self.time = time
        self.max_factor = max_factor
        self.src_addr = src_addr
        self.adnl_addr = adnl_addr

    def serialize(self) -> Cell:
        builder = Builder()
        builder \
            .store_coins(self.stake) \
            .store_uint(self.time, 32) \
            .store_uint(self.max_factor, 32) \
            .store_uint(self.src_addr, 256) \
            .store_uint(self.adnl_addr, 256)
        return builder.end_cell()

    @classmethod
    def deserialize(cls, cell_slice: Slice):
        return cls(stake=cell_slice.load_coins(),
                   time=cell_slice.load_uint(32),
                   max_factor=cell_slice.load_uint(32),
                   src_addr=cell_slice.load_uint(256),
                   adnl_addr=cell_slice.load_uint(256))

class CurrentElection(TlbScheme):
    """
    elect#_ elect_at:uint32    ;; planned time of new set activation
            elect_close:uint32 ;; planned time of closing election for new application
            min_stake:Grams ;; minimal stake accepted
            total_stake:Grams ;; sum of all stakes accepted
            members:(HashmapE 256 Participant) ;; index - validator_pubkey
            failed:Bool
            finished:Bool
              = CurrentElection;
    """
    def __init__(self,
                 elect_at: typing.Optional[int] = 0,
                 elect_close: typing.Optional[int] = 0,
                 min_stake: typing.Optional[int] = 0,
                 total_stake: typing.Optional[int] = 0,
                 members: typing.Optional[dict] = None,
                 failed: typing.Optional[bool] = False,
                 finished: typing.Optional[bool] = False
                 ):
        self.elect_at = elect_at
        self.elect_close = elect_close
        self.min_stake = min_stake
        self.total_stake = total_stake
        self.members = members
        self.failed = failed
        self.finished = finished

    def serialize(self) -> Cell:
        builder = Builder()
        builder \
            .store_uint(self.elect_at, 32) \
            .store_uint(self.elect_close, 32) \
            .store_coins(self.min_stake) \
            .store_coins(self.total_stake)
        builder.store_dict(self.members, lambda k, v: (k, v.serialize()))
        builder.store_bit(1).store_bool(self.failed)
        builder.store_bit(1).store_bool(self.finished)
        return builder.end_cell()

    @classmethod
    def deserialize(cls, cell_slice: Slice):
        return cls(elect_at=cell_slice.load_uint(32),
                   elect_close=cell_slice.load_uint(32),
                   min_stake=cell_slice.load_coins(),
                   total_stake=cell_slice.load_coins(),
                   members=cell_slice.load_dict(key_length=256, value_deserializer=Participant.deserialize),
                   #members=cell_slice.load_maybe_ref(),#TODO
                   failed=cell_slice.load_bool(),
                   finished=cell_slice.load_bool())

class Validator(TlbScheme):
    """
    validator#_ addr:uint256 ;; wallet address of validator
                weight:64
                stake:Grams  ;; accepted stake, can be lower than proposed
                banned:Bool  ;; currently unused flag
                  = Validator;
    """
    def __init__(self,
                 addr: typing.Optional[int] = 0,
                 weight: typing.Optional[int] = 0,
                 stake: typing.Optional[int] = 0,
                 banned: typing.Optional[bool] = False
                 ):
        self.addr = addr
        self.weight = weight
        self.stake = stake
        self.banned = banned

    def serialize(self) -> Cell:
        builder = Builder()
        builder \
            .store_uint(self.addr, 256) \
            .store_uint(self.weight, 64) \
            .store_coins(self.stake)
        builder.store_bit(1).store_bool(self.banned)
        return builder.end_cell()

    @classmethod
    def deserialize(cls, cell_slice: Slice):
        return cls(addr=cell_slice.load_uint(256),
                   weight=cell_slice.load_uint(64),
                   stake=cell_slice.load_coins(),
                   banned=cell_slice.load_bool())

class ValidatorComplaint(TlbScheme):
    """
    validator_complaint#bc validator_pubkey:uint256
                           description:^ComplaintDescr
                           created_at:uint32
                           severity:uint8
                           reward_addr:uint256
                           paid:Grams
                           suggested_fine:Grams
                           suggested_fine_part:uint32
                             = ValidatorComplaint;
    """
    def __init__(self,
                 validator_pubkey: typing.Optional[int] = 0,
                 description: typing.Optional[Cell] = None,
                 created_at: typing.Optional[int] = 0,
                 severity: typing.Optional[int] = 0,
                 reward_addr: typing.Optional[int] = 0,
                 paid: typing.Optional[int] = 0,
                 suggested_fine: typing.Optional[int] = 0,
                 suggested_fine_part: typing.Optional[int] = 0
                 ):
        self.validator_pubkey = validator_pubkey
        self.description = description
        self.created_at = created_at
        self.severity = severity
        self.reward_addr = reward_addr
        self.paid = paid
        self.suggested_fine = suggested_fine
        self.suggested_fine_part = suggested_fine_part

    def serialize(self) -> Cell:
        builder = Builder()
        builder \
            .store_uint(self.validator_pubkey, 256) \
            .store_ref(self.description) \
            .store_uint(self.created_at, 32) \
            .store_uint(self.severity, 8) \
            .store_uint(self.reward_addr, 256) \
            .store_coins(self.paid) \
            .store_coins(self.suggested_fine) \
            .store_uint(self.suggested_fine_part, 32)
        return builder.end_cell()

    @classmethod
    def deserialize(cls, cell_slice: Slice):
        return cls(validator_pubkey=cell_slice.load_uint(256),
                   description=cell_slice.load_ref(),
                   created_at=cell_slice.load_uint(32),
                   severity=cell_slice.load_uint(8),
                   reward_addr=cell_slice.load_uint(256),
                   paid=cell_slice.load_coins(),
                   suggested_fine=cell_slice.load_coins(),
                   suggested_fine_part=cell_slice.load_uint(32))

class ComplaintStatus(TlbScheme):
    """
    complaint_status#2d complaint:^ValidatorComplaint voters:(HashmapE 16 True)
                        vset_id:uint256 weight_remaining:int64 = ComplaintStatus;
    """
    def __init__(self,
                 complaint: typing.Optional[ValidatorComplaint] = None,
                 voters: typing.Optional[dict] = None,
                 vset_id: typing.Optional[int] = 0,
                 weight_remaining: typing.Optional[int] = 0
                 ):
        self.complaint = complaint
        self.voters = voters
        self.vset_id = vset_id
        self.weight_remaining = weight_remaining

    def serialize(self) -> Cell:
        builder = Builder()
        builder \
            .store_cell(self.complaint.serialize())
        builder.store_dict(self.voters, lambda k, v: (k, v))
        builder.store_uint(self.vset_id, 256) \
            .store_int(self.weight_remaining, 64)
        return builder.end_cell()

    @classmethod
    def deserialize(cls, cell_slice: Slice):
        return cls(complaint=ValidatorComplaint.deserialize(cell_slice),
                   voters=cell_slice.load_dict(key_length=16, value_deserializer=lambda x: x.load_bool()),
                   vset_id=cell_slice.load_uint(256),
                   weight_remaining=cell_slice.load_int(64))

class PastElection(TlbScheme):
    """
    elect#_ unfreeze_at:uint32 ;; time validator stakes unfrozen and can be withdrawn
            stake_held:uint32  ;; period for holding stakes frozen, defined by ConfigParam 15
            vset_hash:uint256   ;; validator set cell hash
            frozen_dict:(HashmapE 256 Validator) ;; index validator_pubkey
            total_stake:Grams  ;; sum of accepted stakes of validators
            bonuses:Grams      ;; accumulated bonuses, distributed pro-rata
            complaints:(HashmapE 256 ComplaintStatus) ;; index complaint hash
            = PastElection;
    """
    def __init__(self,
                 unfreeze_at: typing.Optional[int] = 0,
                 stake_held: typing.Optional[int] = 0,
                 vset_hash: typing.Optional[int] = 0,
                 frozen_dict: typing.Optional[dict] = None,
                 total_stake: typing.Optional[int] = 0,
                 bonuses: typing.Optional[int] = 0,
                 complaints: typing.Optional[dict] = None
                 ):
        self.unfreeze_at = unfreeze_at
        self.stake_held = stake_held
        self.vset_hash = vset_hash
        self.frozen_dict = frozen_dict
        self.total_stake = total_stake
        self.bonuses = bonuses
        self.complaints = complaints

    def serialize(self) -> Cell:
        builder = Builder()
        builder \
            .store_uint(self.unfreeze_at, 32) \
            .store_uint(self.stake_held, 32) \
            .store_uint(self.vset_hash, 256)
        builder.store_dict(self.frozen_dict, lambda k, v: (k, v.serialize()))
        builder.store_coins(self.total_stake) \
            .store_coins(self.bonuses)
        builder.store_dict(self.complaints, lambda k, v: (k, v.serialize()))
        return builder.end_cell()

    @classmethod
    def deserialize(cls, cell_slice: Slice):
        return cls(unfreeze_at=cell_slice.load_uint(32),
                   stake_held=cell_slice.load_uint(32),
                   vset_hash=cell_slice.load_uint(256),
                   frozen_dict=cell_slice.load_dict(key_length=256, value_deserializer=Validator.deserialize),
                   total_stake=cell_slice.load_coins(),
                   bonuses=cell_slice.load_coins(),
                   complaints=cell_slice.load_dict(key_length=256, value_deserializer=ComplaintStatus.deserialize)
                   #complaints=cell_slice.load_maybe_ref()#TODO
                   )

class Storage(TlbScheme):
    """
    storage#_ elect:CurrentElection
              credits:(Hashmap 256 Grams) ;; index address
              past_elections:(HashmapE 32 PastElection) ;; index elect_at
              grams:Grams ;; nobody balance
              active_id:uint32  ;; active election id
              active_hash:uint256 ;; hash of current cur_validators cell
              = Storage;
    """
    def __init__(self,
                 elect: typing.Optional[CurrentElection] = None,
                 credits: typing.Optional[dict] = None,
                 past_elections: typing.Optional[dict] = None,
                 grams: typing.Optional[int] = 0,
                 active_id: typing.Optional[int] = 0,
                 active_hash: typing.Optional[int] = 0
                 ):
        self.elect = elect
        self.credits = credits
        self.past_elections = past_elections
        self.grams = grams
        self.active_id = active_id
        self.active_hash = active_hash

    def serialize(self) -> Cell:
        builder = Builder()
        builder \
            .store_cell(self.elect.serialize())
        builder.store_dict(self.credits, lambda k, v: (k, v))
        builder.store_dict(self.past_elections, lambda k, v: (k, v.serialize()))
        builder.store_coins(self.grams) \
            .store_uint(self.active_id, 32) \
            .store_uint(self.active_hash, 256)
        return builder.end_cell()

    @classmethod
    def deserialize(cls, cell_slice: Slice):
        return cls(elect=CurrentElection.deserialize(cell_slice.load_ref().begin_parse()),
                   credits=cell_slice.load_dict(key_length=256, value_deserializer=lambda x: x.load_coins()),
                   past_elections=cell_slice.load_dict(key_length=32, value_deserializer=PastElection.deserialize),
                   grams=cell_slice.load_coins(),
                   active_id=cell_slice.load_uint(32),)
                   #active_hash=cell_slice.load_uint(256)) #TODO

"""
https://toncenter.com/api/v2/getAddressInformation?address=Ef8zMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzM0vF
returns:
	
Response body

{
  "ok": true,
  "result": {
    "@type": "raw.fullAccountState",
    "balance": "1705217663414",
    "code": "<base64>",
    "data": "<base64>",
}
we need function that get data from this api, decodes "data" as cell and return
"""

def load_elector_state():
    # address is always 	Ef8zMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzM0vF
    url = "https://toncenter.com/api/v2/getAddressInformation?address=Ef8zMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzM0vF"
    response = requests.get(url)
    if response.status_code != 200:
        return None
    data = response.json()
    if not data['ok']:
        return None
    data = data['result']
    code = data['code']
    data = data['data']
    return Slice.one_from_boc(base64.b64decode(data))

elector_state = load_elector_state()
#print(elector_state)
parsed = Storage.deserialize(elector_state)


print(parsed)

