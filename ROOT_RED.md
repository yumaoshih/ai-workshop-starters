# Root RED Evidence

Command: `python3 verify_static.py`
Exit: `1`
Observed status: `FAIL`
Observed missing/failed checks: 53
Reason: the persistent artifact root did not yet contain all nine required Starter files and gates. One in-progress `bingo-generator` artifact already existed but still failed the visible reset contract.

This is the pre-implementation batch baseline. The same command must later return exit 0 before `BATCH_VERIFIED_LOCAL` can be considered.
